// Building (release 265; Tim, 2026-10-21): wood walls and stone blocks raised in front of the Wayfarer from carried
// materials. "If you build it out of wood, it'll be like a thin wooden wall... it'll block enemy attacks and enemies
// can't walk through it... A wooden wall would block one enemy attack and a stone [block] 2"; "you can stand on a
// [stone block]... you can stack [them]"; "If you put a [block] into a chasm, into water... it won't even let you do
// that"; "they despawn after 10 seconds"; "the max you could have out... is 5"; world bosses "charge right through"
// them, and their melee "will destroy the blocks... they'll stop the damage", while ranged attacks are absorbed.
//
// A build changes its tile while it stands (the original tile is kept and put back): a wood wall is `blocked`; a stone
// block is a `perch`, one landscape level higher per block stacked (only the Wayfarer may step onto a perch, jumping
// as onto any ledge; in a dungeon, which has no levels, it is simply a block they can stand on). Builds are transient
// like the Turtle's ice: a section load clears them and they are never saved. Data and rules; game.ts calls in.
import { LETHAL_KINDS } from "./landscape.js?v=r631-6b514ad11022";

export const BUILD = {
  kinds: {
    wood: { name: "Wood wall", cost: { wood: 4 }, hits: 1 }, // release 269 (Tim: "a wall takes 4 wood"; it was 5)
    stone: { name: "Stone block", cost: { stone: 5 }, hits: 2, stack: 2 }, // release 269 (Tim: "five stone... twenty blocks with the full inventory"; it was 10)
  },
  life: 10,       // seconds a build stands
  maxOut: 5,      // builds standing at once
  breakReach: .9, // a charging world beast this far past its body from a build's tile breaks it
  reach: 3,       // release 267: in build mode a tap builds up to this many tiles away (Tim: "3 character lengths")
};
export const BUILD_KINDS = Object.keys(BUILD.kinds);

// save.build = { kind } (additive at schema 14): the material the Build button uses, chosen in the Pack.
export function ensureBuild(save) {
  const b = save.build && typeof save.build === "object" ? save.build : {};
  save.build = { ...b, kind: BUILD_KINDS.includes(b.kind) ? b.kind : "wood" };
  if (save.build.continuous !== undefined) save.build.continuous = save.build.continuous === true; // release 283
  return save;
}
export function setBuildKind(save, kind) { ensureBuild(save); if (BUILD_KINDS.includes(kind)) save.build.kind = kind; return save.build.kind; }
// Release 283 (Tim: "a checkbox... continuous build... it'll keep building with [your chosen material] until you've run
// out and then it'll just automatically build with the next resource... when you're out of resources... an X"):
// save.build.continuous (additive, boolean). The chosen kind is always tried first, so new stock of it is used again.
export function setContinuousBuild(save, on) { ensureBuild(save); save.build.continuous = !!on; return save.build.continuous; }
export function canAffordBuild(save, kind) { const [[mat, need]] = Object.entries(BUILD.kinds[kind].cost); return (Number(save?.materials?.[mat]) || 0) >= need; }
// The kind the Build button raises now, or null when nothing can be afforded (the button shows an X).
export function activeBuildKind(save) {
  const { kind, continuous } = ensureBuild(save).build;
  if (canAffordBuild(save, kind)) return kind;
  if (!continuous) return null;
  const i = BUILD_KINDS.indexOf(kind);
  for (let k = 1; k < BUILD_KINDS.length; k++) { const next = BUILD_KINDS[(i + k) % BUILD_KINDS.length]; if (canAffordBuild(save, next)) return next; }
  return null;
}

const W = (map) => map.width || Math.round(Math.sqrt(map.tiles.length));
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// The tile in front of the Wayfarer's feet.
export function buildSpot(p) { const [dx, dy] = DIRS[p.facing] || DIRS.down; return { x: Math.floor(p.x + .5) + dx, y: Math.floor(p.y + .75) + dy }; }
export const buildAt = (map, x, y) => { const w = W(map), t = map?.tiles?.[y * w + x]; return x >= 0 && y >= 0 && x < w && t?.build ? t : null; };

// Can `kind` go on (x, y)? Returns null when it can, or the reason it cannot.
export function buildRefusal(map, x, y, kind, occupied) {
  const w = W(map), h = Math.floor(map.tiles.length / w), t = map.tiles[y * w + x];
  if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1 || !t) return "There is no room to build there.";
  if (t.build) return kind === "stone" && t.build === "stone" && (t.buildLevel || 1) < BUILD.kinds.stone.stack ? null : kind === "stone" && t.build === "stone" ? "Two blocks is as high as they stack." : "Something is already built there.";
  if (LETHAL_KINDS.has(t.kind) || ["canyon", "river", "dungeonWater", "seaIce", "shallows"].includes(t.kind)) return "It would only sink or fall away.";
  if (t.blocked || t.structure || t.door || t.slope) return "The ground there will not take it.";
  if (occupied) return "Something stands there.";
  return null;
}

// Raises a build on (x, y). `game` supplies map, area, builds, save. Returns { ok, message }.
export function placeBuild(game, x, y, kind = activeBuildKind(game.save) || ensureBuild(game.save).build.kind, moving = true, run = null) { // release 283: continuous build picks the kind
  const K = BUILD.kinds[kind], m = (game.save.materials ||= {}), builds = (game.builds ||= []);
  const [[mat, need]] = Object.entries(K.cost), have = Number(m[mat]) || 0;
  if (have < need) return { ok: false, message: `A ${K.name.toLowerCase()} takes ${need} ${mat} (you have ${have}).` };
  const p = game.player, foot = { x: Math.floor(p.x + .5), y: Math.floor(p.y + .75) };
  if (foot.x === x && foot.y === y) return { ok: false, message: "Face open ground to build." };
  // A wall never goes up where any part of the Wayfarer's body stands (the walking footprint, x+.24..x+.76 by
  // y+.5..y+.88), or it would close around them.
  if (kind === "wood" && p.x + .76 > x && p.x + .24 < x + 1 && p.y + .88 > y && p.y + .5 < y + 1) return { ok: false, message: "Step back a little to build there." };
  const occupied = (game.enemies || []).some((e) => !e.dead && Math.floor(e.x + .5) === x && Math.floor(e.y + .75) === y);
  const why = buildRefusal(game.map, x, y, kind, occupied); if (why) return { ok: false, message: why };
  // Release 287 (Tim: "you can only have 5, so the bottom block would disappear"): at the limit the oldest build gives way.
  // A stack's lower block is older than the one on it: removing it lowers the stack, and the upper block stays.
  if (builds.length >= BUILD.maxOut) { const oldest = builds[0]; if (oldest.x === x && oldest.y === y && kind === "stone") return { ok: false, message: "That stack is the oldest build: raise the next block somewhere else." }; breakBuild(game, oldest); }
  const w = W(game.map), i = y * w + x, t = game.map.tiles[i];
  m[mat] = have - need;
  if (t.build === "stone") { // stacking: the block below keeps its own record
    const level = (t.buildLevel || 1) + 1;
    game.map.tiles[i] = { ...t, buildLevel: level, elev: t.landscapeElev + level };
  } else {
    const orig = t, level = 1;
    // Tim: "if I'm just not moving, it can just be the standard regular fence, but if I'm moving to the side it'll be
    // positioned that way": facing left or right, the fence runs up and down across the way; otherwise across.
    game.map.tiles[i] = kind === "wood" ? { ...t, build: "wood", blocked: true, buildOrig: orig, buildRun: run || (moving && (p.facing === "left" || p.facing === "right") ? "v" : "h") } : { ...t, build: "stone", perch: true, buildLevel: level, landscapeElev: t.elev || 0, elev: (t.elev || 0) + level, buildOrig: orig };
  }
  builds.push({ id: `build-${(game.buildSeq = (game.buildSeq || 0) + 1)}`, kind, x, y, hits: K.hits, life: BUILD.life });
  return { ok: true, message: `${K.name} raised. ${m[mat]} ${mat} left.` };
}

// Release 287 (Tim: "if a monster is flying... your blocks that are stacked too high will impede its motion... 2 blocks
// stacked"): a tile no flier may enter (a wall is blocked for everyone already). Charges still break builds (tickBuilds).
export const BUILD_FLIER_STACK = 2;
export function tallBuildAt(map, width, x, y) {
  const left = x + .24, right = x + .76, top = y + .5, bottom = y + .88, h = Math.floor(map.tiles.length / width);
  for (let ty = Math.floor(top); ty <= Math.floor(bottom - 1e-6); ty++) for (let tx = Math.floor(left); tx <= Math.floor(right - 1e-6); tx++) {
    if (tx < 0 || ty < 0 || tx >= width || ty >= h) continue;
    const t = map.tiles[ty * width + tx]; if (t?.build === "wood" || (t?.build === "stone" && (t.buildLevel || 1) >= BUILD_FLIER_STACK)) return true;
  }
  return false;
}
// Removes one build (the top block of a stack first) and restores its tile.
export function breakBuild(game, b) {
  const builds = game.builds || [], at = builds.indexOf(b); if (at < 0) return false;
  builds.splice(at, 1);
  const w = W(game.map), i = b.y * w + b.x, t = game.map.tiles[i]; if (!t?.build) return true;
  if (t.build === "stone" && (t.buildLevel || 1) > 1) { const level = t.buildLevel - 1; game.map.tiles[i] = { ...t, buildLevel: level, elev: t.landscapeElev + level }; }
  else game.map.tiles[i] = t.buildOrig || { ...t, build: undefined, blocked: false, perch: false };
  return true;
}
// A hit on a build: it loses one of its hits and breaks at none. A world beast's melee breaks it outright.
export function strikeBuild(game, b, smash = false) { b.hits = smash ? 0 : b.hits - 1; if (b.hits <= 0) breakBuild(game, b); return true; }
// The topmost build on (x, y), if any.
export const buildOn = (game, x, y) => { const on = (game.builds || []).filter((b) => b.x === x && b.y === y); return on[on.length - 1] || null; };

// The first build crossing the straight line from `from` to the Wayfarer, skipping the tile they stand on (a block
// underfoot does not shield). Positions are entity positions (top-left of a 1x1 body).
export function buildBetween(game, from) {
  if (!game.builds?.length || !from) return null;
  const p = game.player, ax = from.x + .5, ay = from.y + .6, bx = p.x + .5, by = p.y + .6, n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 4));
  const foot = `${Math.floor(p.x + .5)},${Math.floor(p.y + .75)}`, src = `${Math.floor(from.x + .5)},${Math.floor(from.y + .75)}`;
  for (let k = 1; k < n; k++) {
    const x = Math.floor(ax + (bx - ax) * k / n), y = Math.floor(ay + (by - ay) * k / n), key = `${x},${y}`;
    if (key === foot || key === src) continue;
    const b = buildOn(game, x, y); if (b) return b;
  }
  return null;
}

// What a world beast is doing that goes through builds: a charge, dash, slide, spin or thrust.
const RUSH_TAGS = ["charge", "dash", "leap", "combo", "phase"];
export function rushing(e, attackTags = []) { return !!(e.voidDashing || e.voidCharging || e.sliding || e.thrusting || e.spinning || e.giantThrust || attackTags.some((t) => RUSH_TAGS.includes(t))); }

// Each frame: builds crumble when their time is up, and a rushing world beast breaks any build it reaches.
export function tickBuilds(game, dt, tagsOf = () => []) {
  if (!game.builds?.length) return;
  for (const b of [...game.builds]) { b.life -= dt; if (b.life <= 0) breakBuild(game, b); }
  for (const e of game.enemies || []) {
    if (e.dead || !(e.worldBeast || e.questingBeast) || !rushing(e, tagsOf(e))) continue;
    const r = (e.bodyRadius || .5 * (e.scale || 1)) + BUILD.breakReach, cx = e.x + .5, cy = e.y + .6;
    for (const b of [...game.builds]) if (Math.hypot(b.x + .5 - cx, b.y + .5 - cy) <= r) breakBuild(game, b);
  }
}

// Release 267 (Tim: "you hit the toggle button, and then you tap the screen... it'll build... in one of the 8 directions...
// with its longitudinal axis... perpendicular to that direction heading... you can cast the fence... 3 character lengths
// away... if your finger is farther away than three character lengths, it'll... cast the fence at the maximum distance.
// If your finger is within those three character lengths, it'll cast it exactly where you click"; "always aim at the
// tap"). Returns where a tap at world point (wx, wy) builds, and which way a fence there runs: "h" (across), "v" (up and
// down), "ne" (/) or "nw" (\), at right angles to the heading snapped to the nearest of 8 directions.
export function tapTarget(p, wx, wy) {
  const fx = p.x + .5, fy = p.y + .75, dx = wx - fx, dy = wy - fy, d = Math.hypot(dx, dy);
  const k = d > BUILD.reach ? BUILD.reach / d : 1, tx = fx + dx * k, ty = fy + dy * k;
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8; // 0 east, 1 south-east, 2 south ... (screen y down)
  const run = ["v", "ne", "h", "nw", "v", "ne", "h", "nw"][oct];
  return { x: Math.floor(tx), y: Math.floor(ty), run };
}
