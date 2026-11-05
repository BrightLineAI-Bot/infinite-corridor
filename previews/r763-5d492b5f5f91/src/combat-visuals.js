import { dungeonPointDiscovered } from "./dungeon-framework.js?v=r763-5d492b5f5f91";
import { SHADOW_CLONE } from "./late-spells.js?v=r763-5d492b5f5f91";
import { drawBrawler, drawBrawlerAuras } from "./brawler-spells.js?v=r763-5d492b5f5f91";
import { drawOrbit } from "./orbit-volley.js?v=r763-5d492b5f5f91";
import { drawToolForms, drawOrrery } from "./tool-forms.js?v=r763-5d492b5f5f91";
export function drawRangedEffects(ctx,game,width,height) {
  const s = Math.round(Math.max(28, Math.min(44, width / 12))),
    toScreen = (q) => [
      width / 2 + (q.x - game.player.x) * s,
      height / 2 + (q.y - game.player.y) * s,
    ];
  // Release 169: projectiles are drawn in batches, one halo path and one body path per colour, rather than two fills and
  // two alpha changes per projectile. An awakened Lumen Spindle with Echo keeps thirty or more in the air, and on
  // Firefox each separate fill is costly.
  const groups = new Map();
  for (const p of game.projectiles) {
    if(!dungeonPointDiscovered(game.map,p))continue;
    if(p.knife||p.arcWave||p.fireBomb||p.shard||p.orrery)continue; // release 533: drawn by drawToolForms; 547: Fire Burst shells; Sunburst Ricochet shards; the Aether Orrery's by drawOrrery
    const color = p.hostile ? (p.morphOrb?"#ff7be6":p.morphBarb?"#9a62b0":p.path==="grenade"?"#e36b4f":p.path==="arc"?"#f0c66e":p.homingTurnRate?"#b7ce83":p.splitAfter!=null?"#ef9b70":"#d28af0") : p.droneRocket ? "#ff8a3d" : p.damageType === "magic" ? "#9fe8db" : "#d6b276"; // release 321: the drone's rockets burn orange
    let list = groups.get(color); if (!list) groups.set(color, list = []); list.push(p);
  }
  for (const [color, list] of groups) {
    ctx.fillStyle = color;
    // A translucent halo instead of shadowBlur (release 159), which Firefox renders as a separate blur per projectile.
    ctx.globalAlpha = .28; ctx.beginPath();
    for (const p of list) { const [x, y] = toScreen(p), r = (p.damageType === "magic" ? 10 : 8) * (p.scale || 1); /* release 515: Charged Air */ ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r, 0, 0, 7); }
    ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath();
    for (const p of list) {
      const [x, y] = toScreen(p);
      if (p.path === "boomerang") {
        const a = Math.atan2(p.dy, p.dx);
        ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        ctx.lineTo(x + Math.cos(a + 2.35) * 7, y + Math.sin(a + 2.35) * 7);
        ctx.lineTo(x + Math.cos(a - 2.35) * 7, y + Math.sin(a - 2.35) * 7);
        ctx.closePath();
      } else if(p.path==="grenade"){const gr=p.bomblet?4:7;/* release 537: Cluster Shell bomblets */ctx.moveTo(x+gr,y);ctx.arc(x,y,gr,0,7);ctx.moveTo(x,y-gr);ctx.lineTo(x+gr*.57,y-gr*1.57)}else if(p.path==="arc"){const a=Math.atan2(p.dy,p.dx);ctx.moveTo(x+Math.cos(a)*8,y+Math.sin(a)*8);ctx.ellipse(x,y,8,3,a,0,7)}else{const r=(p.damageType === "magic" ? 5 : 3)*(p.scale||1);ctx.moveTo(x+r,y);ctx.arc(x, y, r, 0, 7)}
    }
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const fx of game.effects) {
    if (fx.brawler || fx.kind === "golem-punch" || fx.kind === "riteRubble" || fx.kind === "riteFlash") continue; // the rite's rubble and flash are drawn below; release 483: drawn by drawBrawler; 535: the golem by drawToolForms
    const [x, y] = toScreen(fx);
    ctx.strokeStyle = fx.hostile ? "#e35248cc" : "#b75235aa";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, fx.radius * s, 0, 7);
    ctx.stroke();
    ctx.strokeStyle = "#d99a5255";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, fx.radius * s * (0.72 + 0.08 * Math.sin(fx.life * 12)), 0, 7);
    ctx.stroke();
  }
  // Release 365: Gravity Well (a turning spiral) and Stillpoint (still clock rings) over their circles; the Shadow Clone.
  {const t = performance.now() / 1000;
  drawBrawler(ctx, game, toScreen, s, t); // release 483: Hammerfall, Great Sweep, Iron Fist
  drawBrawlerAuras(ctx, game, toScreen, s, t); // release 485: Aegis, Shadow Boxing
  drawOrbit(ctx, game, toScreen, s, t); // release 487: Orbit Volley
  drawToolForms(ctx, game, toScreen, s, t); // release 533: Nanoknives and the Arc Wave
  drawOrrery(ctx, game, toScreen, s, t); // the Aether Orrery
  if (game.rite && game.area === "overworld") drawRiteFire(ctx, toScreen, s, t); // the Rite of Ascendancy: fire round the section's edges
  for (const fx of game.effects) if (fx.kind === "riteRubble" && fx.life > 0) { const [x, y] = toScreen(fx), k = 1 - fx.life / fx.maxLife, drop = (fx.h || 2) * (1 - k) * s; ctx.fillStyle = k > .85 ? "rgba(120,100,80,.5)" : "#7a6650"; ctx.fillRect(x - s * .07, y - drop - s * .07, s * .14, s * .12); if (k > .8) { ctx.fillStyle = "rgba(160,140,110,.35)"; ctx.beginPath(); ctx.ellipse(x, y, s * .3 * (k - .6) * 3, s * .1, 0, 0, 7); ctx.fill(); } } // the great tree rising: rubble falling off it
  for (const fx of game.effects) if (fx.kind === "riteFlash" && fx.life > 0) { const a = Math.min(1, fx.life / fx.maxLife * 1.4); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,250,235,${a * .9})`; ctx.fillRect(0, 0, ctx.canvas?.width || 4000, ctx.canvas?.height || 4000); ctx.restore(); } // ... the flash as it begins
  for (const fx of game.effects) {
    if (fx.kind !== "gravity-well" && fx.kind !== "stillpoint") continue;
    const [x, y] = toScreen(fx), R = fx.radius * s;
    if (fx.kind === "gravity-well") { ctx.strokeStyle = "#c06faecc"; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let a = 0; a < 5.5; a += .25) { const r = R * (1 - a / 6), q = a + t * 3 + k * 2.1; a ? ctx.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r) : ctx.moveTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } ctx.stroke(); } ctx.fillStyle = "#1a0d2acc"; ctx.beginPath(); ctx.arc(x, y, s * .3, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = "#7c9fcf22"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.strokeStyle = "#cfe3ffaa"; ctx.lineWidth = 1.5; for (const k of [.4, .7]) { ctx.beginPath(); ctx.arc(x, y, R * k, 0, 7); ctx.stroke(); } ctx.beginPath(); for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; ctx.moveTo(x + Math.cos(a) * R * .88, y + Math.sin(a) * R * .88); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } ctx.stroke(); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - R * .55); ctx.stroke(); }
  }
  for (const e of game.enemies) { const f = !e.dead && e.mirror?.frozen; if (!f?.length) continue; // release 369: shots held around the Listener
    f.forEach((q, i) => { const [x, y] = toScreen(q), r = 5 + Math.sin(t * 9 + i) * 1.5; ctx.fillStyle = "#c9a6ff55"; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.fill(); ctx.fillStyle = "#f3eaff"; ctx.beginPath(); ctx.arc(x, y, r * .6, 0, 7); ctx.fill(); });
    const [lx, ly] = toScreen({ x: e.x + .5, y: e.y + .45 }); ctx.strokeStyle = "#c9a6ff88"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(lx, ly, 2.2 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const sc = game.shadowCloneActive?.() && game.shadowClone;
  if (sc) {
    const [x, y] = toScreen({ x: game.player.x + sc.ox + .5, y: game.player.y + sc.oy + .45 }), left = Math.max(0, (sc.until - (game.lastUpdateNow || 0)) / 1000), a = Math.min(1, left / 1.5) * (.62 + .08 * Math.sin(t * 6));
    ctx.save(); ctx.globalAlpha = a;
    if (sc.charging) { // release 417: while the button is held, only a shadow travels the floor, inside the reach ring
      const [px, py] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }), R = SHADOW_CLONE.distance * s, pulse = .5 + .5 * Math.sin(t * 10);
      ctx.globalAlpha = .7; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .35; ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + s * .36); ctx.lineTo(x, y + s * .36); ctx.stroke();
      ctx.globalAlpha = .78; ctx.fillStyle = "#140a24"; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .42, s * .17, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = .5 + .3 * pulse; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .48, s * .2, 0, 0, 7); ctx.stroke();
      ctx.restore();
    } else {
    ctx.fillStyle = "#00000055"; ctx.beginPath(); ctx.ellipse(x, y + s * .36, s * .3, s * .1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#1b1030"; ctx.beginPath(); ctx.moveTo(x - s * .24, y + s * .34); ctx.quadraticCurveTo(x - s * .28, y - s * .1, x - s * .12, y - s * .2); ctx.lineTo(x + s * .12, y - s * .2); ctx.quadraticCurveTo(x + s * .28, y - s * .1, x + s * .24, y + s * .34); ctx.closePath(); ctx.fill(); // cloak
    ctx.beginPath(); ctx.arc(x, y - s * .32, s * .15, 0, 7); ctx.fill(); // hood
    ctx.fillStyle = "#b48cff"; ctx.fillRect(x - s * .07, y - s * .34, s * .04, s * .03); ctx.fillRect(x + s * .03, y - s * .34, s * .04, s * .03); // eyes
    ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, s * .45, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if ((sc.swingUntil || 0) > (game.lastUpdateNow || 0) && sc.swingDir) { const ang = Math.atan2(sc.swingDir.y, sc.swingDir.x); ctx.strokeStyle = "#b48cffcc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, s * .9, ang - .9, ang + .9); ctx.stroke(); }
    if (game.cloneAim) { ctx.globalAlpha = .5; ctx.strokeStyle = "#b48cff"; ctx.lineWidth = 1; ctx.setLineDash([2, 5]); const [px, py] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }); ctx.beginPath(); ctx.arc(px, py, 2 * s, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if ((sc.blockedUntil || 0) > (game.lastUpdateNow || 0)) { ctx.globalAlpha = 1; ctx.font = `bold ${Math.round(s * .36)}px monospace`; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#091018"; ctx.strokeText("BLOCKED", x, y - s * .7); ctx.fillStyle = "#ff7a7a"; ctx.fillText("BLOCKED", x, y - s * .7); ctx.textAlign = "left"; }
    ctx.restore();}
  }}
  const target = game.lockedTarget?.(); // release 309: brackets on the locked target
  if (target && !target.gloomVeil) { // the lock holds on the Gloomvast through its Dark, but shows nothing: it must not give it away
    const [x, y] = toScreen({ x: target.x + .5, y: target.y + .45 }), r = Math.max(.6, (Number(target.bodyRadius) || .4) + .3, (Number(target.scale) || 1) * .45) * s, k = r * .45, t = performance.now() / 1000;
    ctx.strokeStyle = "#ff6a5a"; ctx.lineWidth = 2.5; ctx.globalAlpha = .75 + .25 * Math.sin(t * 5); ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(x + sx * r, y + sy * (r - k)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - k), y + sy * r); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (game.reticle?.life > 0) {
    const [x, y] = toScreen(game.reticle);
    ctx.globalAlpha = Math.min(1, game.reticle.life * 2);
    ctx.strokeStyle = "#d7c58b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 7);
    ctx.moveTo(x - 18, y);
    ctx.lineTo(x - 7, y);
    ctx.moveTo(x + 7, y);
    ctx.lineTo(x + 18, y);
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y - 7);
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x, y + 18);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// The Rite of Ascendancy (ascendancy.ts): a band of flame along the section's four edges while the rite burns. Only the flames on
// screen are drawn (at most a screen's width of them a side).
function drawRiteFire(ctx, toScreen, s, t) {
  const W = ctx.canvas?.width || 2000, H = ctx.canvas?.height || 2000;
  const flame = (x, y, i) => { const [px, py] = toScreen({ x, y }); if (px < -s || py < -s * 2 || px > W + s || py > H + s) return;
    const f = .7 + .3 * Math.sin(t * 9 + i * 1.7), h = s * (.9 + .5 * f);
    const g = ctx.createLinearGradient(px, py, px, py - h); g.addColorStop(0, "rgba(255,120,30,.9)"); g.addColorStop(.6, "rgba(255,190,70,.65)"); g.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - s * .35, py); ctx.quadraticCurveTo(px - s * .2, py - h * .5, px + Math.sin(t * 5 + i) * s * .12, py - h); ctx.quadraticCurveTo(px + s * .2, py - h * .5, px + s * .35, py); ctx.closePath(); ctx.fill(); };
  ctx.save();
  for (let i = 0; i <= 32; i += .7) { flame(i, .4, i); flame(i, 31.9, i + 3); }
  for (let j = 0; j <= 32; j += .7) { flame(.2, j + .5, j + 7); flame(31.6, j + .5, j + 11); }
  ctx.restore();
}

// VIEWPORT CLOSED (Tim, 2026-11-04: "it should say VIEWPORT CLOSED, then the screen gets some static — not a lot, some — and
// slowly fades out to nothingness, into black. Then your character wakes up again at the last rest point."). Presentation
// only: the Game's recovery (resolveDeath) is unchanged and still runs once, after the short live beat of the fall
// (Game.deathBeat). From then the picture held on screen is a snapshot of the last frame, with words, light static, tear
// lines and a fade to black over it; the world is frozen until the re-opening at the rest point. Every timing is here.
export const VIEWPORT_CLOSED = Object.freeze({
  fall: .35,        // s: the live beat of the fall (Game.deathBeat), before the recovery runs
  wait: 1.5,        // s past the fall to wait for the recovery; then the sequence lets go (never stuck in black)
  close: 2.75,      // s after the recovery: the words, the static and the fade to black (about 3.1 s from death to black)
  textIn: .16,      // s: the words stutter on
  textOut: .7,      // s before black: the words go with the picture
  fadeFrom: .3,     // s after the recovery when the picture starts to go
  staticPeak: .2,   // the static's opacity at its height: some, not a lot
  staticRise: 2.2,  // s to reach it
  scanlines: .14,   // opacity of the scanlines over the closing picture
  hold: .4,         // s of black
  open: .8,         // s: the fade back in at the rest point
  openStatic: .16,  // static at the start of the re-opening, thinning to nothing
  slit: .3,         // share of the re-opening spent widening the picture from a line
  flickerHz: 16,    // noise frames and flicker ticks per second
  flickerDip: .13,  // share of flicker ticks on which the words dip
  tearHz: 7,        // tear lines re-roll per second
  tearChance: .5,   // chance a tear line shows on a tick
  color: "#cfe6dc", glow: "#5fbfae", // the words: the Corridor's pale lumen teal
  quality: Object.freeze({
    low: Object.freeze({ frames: 2, cols: 96, tears: 1, snapshot: .5, glow: false }),
    balanced: Object.freeze({ frames: 3, cols: 150, tears: 2, snapshot: .75, glow: true }),
    full: Object.freeze({ frames: 4, cols: 200, tears: 3, snapshot: 1, glow: true }),
  }),
});
// Stands in for the player's input while the sequence runs: nothing moves, nothing is pressed.
export const VIEWPORT_QUIET_INPUT = Object.freeze({ state: Object.freeze({ x: 0, y: 0 }), consume: () => false, held: () => false, reset() {} });
const vcClamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v), vcEase = (v) => { v = vcClamp(v); return v * v * (3 - 2 * v); };
const vcHash = (n) => { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
// seq: { t, c (s into the closing, null in the fall), frozen (s the world stood still), deaths, live, resolved, done }.
// live (a great beast is present, Game.fallen.live): the world keeps running and is drawn through the fall and the closing,
// the beast looming over the corpse; the recovery runs at black. Otherwise the recovery runs after the fall and the closing
// is drawn over a snapshot of the last frame, the world frozen.
export function viewportClosedStart(deaths = 0, resolved = false, live = false) { return { t: 0, c: resolved ? 0 : null, frozen: 0, deaths: Number(deaths) || 0, live: !!live && !resolved, resolved: !!resolved, done: false }; }
export function viewportClosedTotal() { const V = VIEWPORT_CLOSED; return V.close + V.hold + V.open; }
// What to show for a sequence: the phase, whether the world runs and is drawn, and the overlay's amounts.
export function viewportClosedStage(seq, reduceMotion = false) {
  const V = VIEWPORT_CLOSED, motion = !reduceMotion, out = { phase: "done", world: true, live: false, black: 0, text: 0, noise: 0, slit: 1, tears: false, flicker: false, scan: 0 };
  if (!seq || seq.done) return out;
  if (seq.c === null) { out.phase = "fall"; return out; }
  const pending = seq.live && !seq.resolved, c = pending ? Math.min(seq.c, V.close - 1e-6) : seq.c;
  if (c < V.close) {
    out.phase = "closing"; out.world = pending; out.live = pending;
    out.black = vcEase((c - V.fadeFrom) / (V.close - V.fadeFrom));
    out.text = vcClamp(c / V.textIn) * (1 - vcClamp((c - (V.close - V.textOut)) / V.textOut));
    out.noise = motion ? V.staticPeak * vcEase(c / V.staticRise) : 0;
    out.tears = motion; out.flicker = motion; out.scan = motion ? V.scanlines : 0;
    return out;
  }
  if (c < V.close + V.hold) { out.phase = "black"; out.world = false; out.black = 1; return out; }
  const o = (c - V.close - V.hold) / V.open;
  if (o < 1) { out.phase = "opening"; out.black = 1 - vcEase(o); out.noise = motion ? V.openStatic * (1 - o) : 0; out.slit = motion ? vcEase(o / V.slit) : 1; return out; }
  return out;
}
// One frame of bookkeeping. fallen: the Game holds the Wayfarer in the beat of the fall; deaths: save.worldFlags.deaths;
// known: the count when no sequence ran. Returns { seq, start, snap (take the snapshot now, before drawing), release (the
// world runs again: shift its clocks by seq.frozen), end }.
export function viewportClosedTick(seq, { dt = 0, fallen = false, live = false, deaths = 0, known = 0, reduceMotion = false } = {}) {
  const V = VIEWPORT_CLOSED, ev = { seq, start: false, snap: false, release: false, end: false };
  dt = Math.max(0, Math.min(.25, Number(dt) || 0));
  if (seq && seq.resolved && (fallen || deaths > seq.deaths)) seq = ev.seq = null; // felled again while re-opening: start over
  if (!seq) {
    if (fallen) { ev.seq = viewportClosedStart(deaths, false, live); ev.start = true; }
    else if (deaths > known) { ev.seq = viewportClosedStart(deaths, true); ev.start = ev.snap = true; }
    return ev;
  }
  const recovered = !fallen || deaths > seq.deaths;
  if (!seq.resolved) {
    seq.t += dt;
    if (seq.live) { // the world runs on until the recovery, which lands at black
      if (recovered) { seq.resolved = true; seq.deaths = deaths; seq.c = Math.max(seq.c ?? 0, V.close); }
      else if (seq.t >= V.fall) seq.c = seq.t - V.fall;
      if (!recovered && seq.t > V.fall + V.close + V.wait) seq.done = ev.end = true;
      return ev;
    }
    if (recovered) { seq.resolved = true; seq.c = 0; seq.deaths = deaths; ev.snap = true; }
    else if (seq.t > V.fall + V.wait) seq.done = ev.end = true;
    return ev;
  }
  const before = viewportClosedStage(seq, reduceMotion);
  seq.t += dt; seq.c += dt;
  if (!before.world) seq.frozen += dt;
  const after = viewportClosedStage(seq, reduceMotion);
  if (!before.world && after.world) ev.release = true;
  if (seq.c >= viewportClosedTotal()) seq.done = ev.end = true;
  return ev;
}
// The static: a few small noise frames drawn once (cols wide, the screen's aspect), upscaled and scrolled when drawn.
export function viewportNoiseFrames(makeCanvas, quality = "balanced", aspect = 1.4, seed = 0x51a7) {
  const q = VIEWPORT_CLOSED.quality[quality] || VIEWPORT_CLOSED.quality.balanced, cols = q.cols, rows = Math.max(8, Math.min(cols * 3, Math.round(cols * (Number(aspect) || 1.4)))), frames = [];
  let s = seed >>> 0;
  for (let f = 0; f < q.frames; f++) {
    const c = makeCanvas(cols, rows), x = c.getContext("2d"), img = x.createImageData(cols, rows), d = img.data;
    for (let i = 0; i < d.length; i += 4) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const v = 34 + ((s >>> 24) * .8 | 0); d[i] = v * .9; d[i + 1] = v; d[i + 2] = v * .97; d[i + 3] = 255; }
    x.putImageData(img, 0, 0); frames.push(c);
  }
  return frames;
}
// Draws the overlay for a stage. art: { snapshot (canvas or null), sw, sh (its size), noise (frames), scan (a CanvasPattern
// or null) }; t is the sequence's own clock (s). A fixed, small number of draws per frame; no per-pixel work.
export function drawViewportClosed(ctx, stage, w, h, t, art = {}, quality = "balanced") {
  if (!stage || stage.phase === "done" || stage.phase === "fall") return;
  const V = VIEWPORT_CLOSED, q = V.quality[quality] || V.quality.balanced, tick = Math.floor(t * V.flickerHz);
  ctx.save();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  const snap = art.snapshot; // for a live closing, the game's own canvas (tears are copied from it)
  if (!stage.world) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); }
  {
    if (snap && stage.black < 1) {
      const sw = art.sw || snap.width, sh = art.sh || snap.height;
      if (!stage.world) { ctx.imageSmoothingEnabled = true; ctx.drawImage(snap, 0, 0, sw, sh, 0, 0, w, h); }
      if (stage.tears) { const tt = Math.floor(t * V.tearHz);
        for (let i = 0; i < q.tears; i++) { const k = tt * 7 + i * 131; if (vcHash(k) > V.tearChance) continue;
          const y = vcHash(k + 1) * h, bh = Math.max(1, h * (.004 + .018 * vcHash(k + 2))), dx = (vcHash(k + 3) - .5) * w * .07;
          ctx.drawImage(snap, 0, y / h * sh, sw, Math.max(1, bh / h * sh), dx, y, w, bh);
          ctx.globalAlpha = .22; ctx.fillStyle = V.color; ctx.fillRect(0, y, w, 1); ctx.globalAlpha = 1; } }
    }
  }
  if (stage.black > 0) { ctx.globalAlpha = Math.min(1, stage.black); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  const frames = art.noise || [], noise = stage.noise * Math.sqrt(Math.max(0, 1 - stage.black));
  if (noise > .002 && frames.length) {
    const f = frames[tick % frames.length], off = vcHash(tick + 77) * h;
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = noise;
    ctx.drawImage(f, 0, -off, w, h); ctx.drawImage(f, 0, h - off, w, h);
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  }
  if (stage.scan > 0 && art.scan && stage.black < 1) { ctx.globalAlpha = stage.scan * (1 - stage.black * .6); ctx.fillStyle = art.scan; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
  if (stage.slit < 1) { const band = Math.max(2, h * stage.slit), top = (h - band) / 2;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, top); ctx.fillRect(0, top + band, w, h - top - band);
    ctx.globalAlpha = .55 * (1 - stage.slit); ctx.fillStyle = V.color; ctx.fillRect(0, top - 1, w, 2); ctx.fillRect(0, top + band - 1, w, 2); ctx.globalAlpha = 1; }
  if (stage.text > 0) {
    let a = stage.text;
    if (stage.flicker && (vcHash(tick + 9) < V.flickerDip || (stage.text < 1 && (tick & 1)))) a *= .45;
    const words = "VIEWPORT CLOSED", size = Math.round(Math.max(15, Math.min(30, w * .052))), adv = size * .78, total = adv * (words.length - 1) + size * .62, x0 = (w - total) / 2, y = h * .4; // above the fallen Wayfarer, who stays in view at the centre
    ctx.font = `600 ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.globalAlpha = a; ctx.fillStyle = V.color;
    if (q.glow) { ctx.shadowColor = V.glow; ctx.shadowBlur = size * .5; }
    for (let i = 0; i < words.length; i++) if (words[i] !== " ") ctx.fillText(words[i], x0 + i * adv, y);
    ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
    ctx.globalAlpha = a * .5; ctx.fillRect(x0, y + size * .78, total, 1);
    if (!stage.flicker || (Math.floor(t * 2.5) & 1) === 0) { ctx.globalAlpha = a * .8; ctx.fillRect(x0 + total + size * .3, y - size * .4, size * .45, size * .8); } // the cursor
    if (art.scan) { ctx.globalAlpha = a * .5; ctx.fillStyle = art.scan; ctx.fillRect(x0 - 4, y - size * .7, total + size, size * 1.6); }
  }
  ctx.restore();
}
