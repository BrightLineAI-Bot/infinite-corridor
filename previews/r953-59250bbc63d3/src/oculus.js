// The Oculus (release 874; Tim, 2026-11-10: "Make a close view button. The button should make the character spawn a dais
// that you can step through and it will take you to close view, or vice versa. The dais will persist for 5 seconds and it
// will warp you to close view if you step on it, or warp you to abstract view when in close view. It will be called the
// Oculus"). One of the utility button's choices (spell-slots.ts UTILITY).
//
// Pressing it opens a dais one tile ahead of where the Wayfarer faces (release 875: eight directions) (the nearest free walkable tile when that one is blocked).
// Stepping onto it switches the camera through the existing Close View settings: inside interiors the indoor switch
// (save.closeView), everywhere else the release-867 Overworld Close View switch (save.overworldCloseView). Close View's own
// blend (close-view.ts closeViewFrame) is the warp, with a short flash in the HUD; both are skipped under Reduced Motion.
// The dais is presentation and a toggle only: no combat effect. It lives on the Game as runtime state (`game.oculus`), is
// never saved, and is dropped on a change of map or when a pause outlasts it.
import { buildSpot } from "./building.js?v=r953-59250bbc63d3";
import { CLOSE_VIEW_HOOKS, CLOSE_VIEW_PLACES, closeViewPlaceAllowed, interiorMap, overworldCloseViewApplies, closeViewWanted } from "./close-view.js?v=r953-59250bbc63d3";
import { closeViewGLStats } from "./close-view-gl.js?v=r953-59250bbc63d3";

export const OCULUS = Object.freeze({
  seconds: 5, // the dais stands this long, then it is gone
  fade: .8, // over its last seconds it fades out
  open: .25, // over its first seconds it opens (drawn growing)
  cooldown: 1.5, // seconds after a dais ends (stepped on or expired) before another press answers
  search: 3, // a blocked spot ahead looks for the nearest free tile within this many tiles of it
  warpMs: 700, // the HUD's warp flash (main.ts), not shown under Reduced Motion
  radius: .42, // drawn size, in tiles
  spin: .5, // turns of its rays a second (still under Reduced Motion)
  colors: Object.freeze({ close: Object.freeze({ glow: "#5fe0d8", rim: "#1c4a52", iris: "#9ff4ee", lens: "#e8fffd" }), top: Object.freeze({ glow: "#f0b45a", rim: "#4f3618", iris: "#ffd890", lens: "#fff4dc" }) }),
});
// Test and lab seam: `gpu` replaces the WebGL2 check (a function returning true or false).
export const OCULUS_HOOKS = { gpu: null };

const gpuReady = () => (typeof OCULUS_HOOKS.gpu === "function" ? !!OCULUS_HOOKS.gpu() : typeof WebGL2RenderingContext !== "undefined" && CLOSE_VIEW_HOOKS.gl !== false && !closeViewGLStats.failed);
const indoorMap = (g) => !!g?.player && g.area === "dungeon" && interiorMap(g.map);
const playerTile = (p) => ({ x: Math.floor(p.x + .5), y: Math.floor(p.y + .75) });

// Where stepping onto a dais would take you now: "close" (Close View) or "top" (the ordinary top-down view).
export const oculusTarget = (g) => (closeViewWanted(g) ? "top" : "close");
// Whether a dais may open here. { ok, to, setting, why }: `setting` is the save switch the step will flip.
export function oculusAvailable(g) {
  if (!g?.player || !g.map?.tiles?.length) return { ok: false, why: "The Oculus cannot open here." };
  if (oculusTarget(g) === "top") return { ok: true, to: "top", setting: indoorMap(g) && g.save?.closeView === true ? "closeView" : "overworldCloseView" };
  // Tim, 2026-11-11: Close View is for the overworld, buildings, the Pentagon, the Stillworks, seed realms and the
  // Deep (close-view.ts CLOSE_VIEW_PLACES); in an ordinary dungeon or crossing the Oculus stays shut, and no setting changes.
  if (!closeViewPlaceAllowed(g)) return { ok: false, why: CLOSE_VIEW_PLACES.occluded };
  if (indoorMap(g)) return { ok: true, to: "close", setting: "closeView" }; // the interior view keeps its own fallbacks (2D view, overhead camera)
  if (!overworldCloseViewApplies({ save: { overworldCloseView: true }, player: g.player, map: g.map, area: g.area })) return { ok: false, why: "Close View cannot show this place; the Oculus stays shut." };
  if (!gpuReady()) return { ok: false, why: "Close View needs WebGL2 out here, and this device has none; the Oculus stays shut." };
  return { ok: true, to: "close", setting: "overworldCloseView" };
}
// The tile for a dais: one ahead of the Wayfarer (oculusAhead), or the nearest free one to it (never the Wayfarer's own). Null if none.
// `open(x, y)` says whether a tile is free walkable ground.
// Release 875 (Tim, 2026-11-11: "the dais should appear just in front of where the character's facing"): "ahead" follows the
// Wayfarer's own heading, to the nearest of eight directions, so a diagonal walk (Close View steers in any direction) opens it
// on the diagonal. The heading is the last move; when the Wayfarer has turned since (an attack, a lock), the facing wins.
const CARDINAL = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function oculusAhead(p) {
  const f = CARDINAL[p?.facing] || CARDINAL.down, v = p?.lastMoveVector, m = v ? Math.hypot(v.x, v.y) : 0, me = playerTile(p);
  if (m > .04) {
    const a = Math.round(Math.atan2(v.y, v.x) / (Math.PI / 4)) * (Math.PI / 4), dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a));
    if ((f[0] && dx === f[0]) || (f[1] && dy === f[1])) return { x: me.x + dx, y: me.y + dy }; // it agrees with the facing
  }
  return buildSpot(p);
}
export function oculusSpot(p, open, search = OCULUS.search) {
  const at = oculusAhead(p), me = playerTile(p), free = (x, y) => !(x === me.x && y === me.y) && open(x, y);
  if (free(at.x, at.y)) return at;
  for (let r = 1; r <= search; r++) {
    let best = null, bestD = Infinity;
    for (let y = at.y - r; y <= at.y + r; y++) for (let x = at.x - r; x <= at.x + r; x++) {
      if (Math.max(Math.abs(x - at.x), Math.abs(y - at.y)) !== r || !free(x, y)) continue;
      const d = (x - at.x) ** 2 + (y - at.y) ** 2; if (d < bestD) { bestD = d; best = { x, y }; } // ties: the first in reading order
    }
    if (best) return best;
  }
  return null;
}
// The press. True when a dais opened. A press while one stands does nothing.
export function pressOculus(g, now, open) {
  if (g.oculus) { if (g.oculus.map === g.map && now < g.oculus.until) return false; g.oculus = null; }
  if (now < (g.oculusReadyAt || 0)) { g.message = `The Oculus is still closing (${Math.ceil((g.oculusReadyAt - now) / 1000)}s).`; return false; }
  const a = oculusAvailable(g); if (!a.ok) { g.message = a.why; return false; }
  const at = oculusSpot(g.player, open); if (!at) { g.message = "No open ground ahead for the Oculus."; return false; }
  g.oculus = { x: at.x, y: at.y, born: now, until: now + OCULUS.seconds * 1000, to: a.to, setting: a.setting, map: g.map };
  g.message = a.to === "close" ? "An Oculus opens ahead: step onto it for Close View." : "An Oculus opens ahead: step onto it to return to the top-down view.";
  return true;
}
// Switches the view as a step onto the dais does. Returns the view it switched to.
export function oculusSwitch(g, to) {
  const s = g.save; if (!s) return null;
  if (to === "close") { if (indoorMap(g)) s.closeView = true; else s.overworldCloseView = true; }
  else { if (indoorMap(g)) s.closeView = false; if (overworldCloseViewApplies(g)) s.overworldCloseView = false; }
  return to;
}
// Each update: the dais ends with its time, its map, or a step onto it (which switches the view). Returns "warp" on a step.
export function tickOculus(g, now) {
  const o = g.oculus; if (!o) return null;
  if (o.map !== g.map) { g.oculus = null; return null; }
  if (now >= o.until || now < o.born) { g.oculus = null; g.oculusReadyAt = now + OCULUS.cooldown * 1000; return null; }
  const me = playerTile(g.player); if (me.x !== o.x || me.y !== o.y) return null;
  const to = oculusSwitch(g, o.to); g.oculus = null; g.oculusReadyAt = now + OCULUS.cooldown * 1000; g.oculusWarp = { at: now, to };
  g.message = to === "close" ? "Through the Oculus: Close View." : "Through the Oculus: the top-down view.";
  return "warp";
}
// Its look: a ring of dark stone, a glowing iris and an upright lens, eight rays turning slowly; teal toward Close View,
// amber back to the top-down view. `sx`, `sy` map world to the drawing's pixels, `s` is a tile's size there.
export function drawOculusDais(ctx, o, now, sx, sy, s, reduce = false) {
  if (!o || !ctx) return;
  const O = OCULUS, C = O.colors[o.to === "top" ? "top" : "close"], age = (now - o.born) / 1000, left = (o.until - now) / 1000;
  const grow = Math.max(.05, Math.min(1, age / O.open)), alpha = Math.max(0, Math.min(1, left / O.fade)), x = sx(o.x + .5), y = sy(o.y + .5), r = s * O.radius * (reduce ? 1 : grow);
  if (!(alpha > 0) || !(r > 0)) return;
  const turn = reduce ? 0 : age * O.spin * Math.PI * 2, pulse = reduce ? 1 : .85 + .15 * Math.sin(age * 5);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = C.glow + "33"; ctx.beginPath(); ctx.arc(x, y, r * 1.35 * pulse, 0, Math.PI * 2); ctx.fill(); // the halo
  ctx.fillStyle = C.rim; ctx.strokeStyle = C.glow; ctx.lineWidth = Math.max(1.5, s * .06); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // the dais
  ctx.strokeStyle = C.iris; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = turn + i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); ctx.lineTo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86); } ctx.stroke(); // the rays
  ctx.beginPath(); ctx.arc(x, y, r * .5, 0, Math.PI * 2); ctx.stroke(); // the iris
  ctx.fillStyle = C.lens; ctx.beginPath(); ctx.ellipse(x, y, r * .2, r * .4, 0, 0, Math.PI * 2); ctx.fill(); // the upright lens
  ctx.fillStyle = C.rim; ctx.beginPath(); ctx.ellipse(x, y, r * .07, r * .2, 0, 0, Math.PI * 2); ctx.fill(); // its pupil
  ctx.restore();
}
