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
import { LETHAL_KINDS } from "./landscape.js?v=r889-1711f90d36f9";

// Runtime-only cache invalidation: no tile scans per frame and nothing serialized.
const buildVisuals = new WeakMap();
export const buildVisualRevision = (map) => buildVisuals.get(map)?.revision || 0;
export const hasStoneBuilds = (map) => buildVisuals.get(map)?.stone === true;
function changedBuilds(game) { buildVisuals.set(game.map, { revision: (buildVisualRevision(game.map) + 1) >>> 0, stone: game.builds.some(b => b.kind === "stone") }); }

export const BUILD = {
  kinds: {
    wood: { name: "Wood wall", cost: { wood: 4 }, hits: 1 }, // release 269 (Tim: "a wall takes 4 wood"; it was 5)
    stone: { name: "Stone block", cost: { stone: 5 }, hits: 2, stack: 2 }, // release 269 (Tim: "five stone... twenty blocks with the full inventory"; it was 10)
    // Release 696: the Enclosure (Tim: "you build with 2 wood, 2 stone and 2 cinder iron... a little shack that the player can walk
    // into... a 2 by 2... you become impervious to damage on 3 sides... you can't attack out of it... you can dodge out of it from the
    // opening... you can trap the stalker... maybe you have to do 2 enclosures... like pokemon... the chance goes up").
    enclosure: { name: "Enclosure", cost: { wood: 2, stone: 2, cinderIron: 2 }, hits: 4, life: 60 },
  },
  life: 10,       // seconds a build stands
  maxOut: 5,      // builds standing at once
  breakReach: .9, // a charging world beast this far past its body from a build's tile breaks it
  reach: 3,       // release 267: in build mode a tap builds up to this many tiles away (Tim: "3 character lengths")
};
export const BUILD_KINDS = Object.keys(BUILD.kinds);
// The Enclosure: a 2x2 pen walled on three sides, open toward the Wayfarer who raised it. Inside, blows from the walled sides do not
// land for `guard` s (again after `recharge` s outside); no blow, shot or spell goes out of it (items still work). A second pen
// built across a pen's opening closes it (release 697): if the Stalker is inside, that is the try to trap it, `trap.full` chance at
// full health rising to `trap.low` at `trap.lowAt` of its health and below; caught, it struggles for `trap.time` s, then breaks the
// pen and comes out. (`need`: the pens it takes, the one it is in and the one that closes it.)
export const ENCLOSURE = { size: 2, guard: 3, recharge: 3, need: 2, trap: { full: .15, low: .6, lowAt: .25, time: 45 } };
// Release 748 (Tim, 2026-11-04: "bigger beasts need more materials"): what a pen of each side costs, growing with its area (the 2x2
// is BUILD.kinds.enclosure's own cost). A side past the table costs its largest row.
export const PEN_COST = { 2: { wood: 2, stone: 2, cinderIron: 2 }, 3: { wood: 4, stone: 4, cinderIron: 3 }, 4: { wood: 5, stone: 5, cinderIron: 4 } }; // per piece (Tim: a whole 4x4 try, both pieces, is 10 wood, 10 stone, 8 cinder iron)
export function penCost(n) { const sides = Object.keys(PEN_COST).map(Number).sort((a, b) => a - b), k = sides.filter((v) => v <= n).pop() ?? sides[0]; return PEN_COST[k]; }
export const costText = (cost) => Object.entries(cost).map(([k, n]) => `${n} ${k === "cinderIron" ? "cinder iron" : k}`).join(", ");
const affords = (save, cost) => Object.entries(cost).every(([mat, need]) => (Number(save?.materials?.[mat]) || 0) >= need);
export function trapChance(hpFrac) { const T = ENCLOSURE.trap, f = Math.max(0, Math.min(1, Number(hpFrac) || 0)); return f <= T.lowAt ? T.low : T.full + (T.low - T.full) * (1 - f) / (1 - T.lowAt); }

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
export function canAffordBuild(save, kind) { return Object.entries(BUILD.kinds[kind].cost).every(([mat, need]) => (Number(save?.materials?.[mat]) || 0) >= need); }
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
  if (kind === "enclosure") return placeEnclosure(game, x, y);
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
  changedBuilds(game);
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
  if (b.kind === "enclosure") { for (const [i, orig] of Object.entries(b.orig || {})) game.map.tiles[Number(i)] = orig; changedBuilds(game); return true; }
  const w = W(game.map), i = b.y * w + b.x, t = game.map.tiles[i]; if (!t?.build) { changedBuilds(game); return true; }
  if (t.build === "stone" && (t.buildLevel || 1) > 1) { const level = t.buildLevel - 1; game.map.tiles[i] = { ...t, buildLevel: level, elev: t.landscapeElev + level }; }
  else game.map.tiles[i] = t.buildOrig || { ...t, build: undefined, blocked: false, perch: false };
  changedBuilds(game);
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
  for (const b of [...game.builds]) { if (b.trapped && !(game.enemies || []).some((e) => e.id === b.trapped && !e.dead && e.stalkTrapped > 0)) b.trapped = null; /* release 697: let go when what it held is gone */ b.life -= dt; if (b.trapped) b.life = Math.max(b.life, 1); if (b.life <= 0) breakBuild(game, b); } // a pen holding the Stalker stands until it breaks out
  tickEnclosureGuard(game, dt);
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

// ---- The Enclosure (release 696) ----
// Raises a 2x2 pen beginning at (x, y), extending away from the Wayfarer, open on the side facing them.
// Release 748 (beast mounts): `game.penSize()` (when it has one) sizes the pen for the biggest catchable beast near: a pen of side
// n spans n×n tiles, centred across the way, and costs `penCost(n)` (PEN_COST).
export function placeEnclosure(game, x, y) {
  const N = Math.max(ENCLOSURE.size, Math.floor(Number(game.penSize?.()) || ENCLOSURE.size)), cost = N > ENCLOSURE.size ? penCost(N) : BUILD.kinds.enclosure.cost;
  const K = BUILD.kinds.enclosure, m = (game.save.materials ||= {}), builds = (game.builds ||= []), p = game.player, w = W(game.map);
  if (!affords(game.save, cost)) return { ok: false, message: `${N > ENCLOSURE.size ? `A ${N}×${N} enclosure (sized for the beast near)` : "An enclosure"} takes ${costText(cost)}.` };
  const fx = Math.floor(p.x + .5), fy = Math.floor(p.y + .75), dx = x - fx, dy = y - fy, horiz = Math.abs(dx) > Math.abs(dy);
  const open = horiz ? (dx > 0 ? "west" : "east") : (dy > 0 ? "north" : "south"), across = Math.floor((N - 1) / 2); // centred across the way (0 for the 2x2, as before)
  const x0 = horiz ? (dx > 0 ? x : x - (N - 1)) : x - across, y0 = horiz ? y - across : (dy > 0 ? y : y - (N - 1));
  const tiles = [];
  for (let oy = 0; oy < N; oy++) for (let ox = 0; ox < N; ox++) {
    const tx = x0 + ox, ty = y0 + oy, why = buildRefusal(game.map, tx, ty, "enclosure", false); if (why) return { ok: false, message: why };
    if (game.map.tiles[ty * w + tx]?.enclosure) return { ok: false, message: "Something is already built there." };
    if (p.x + .76 > tx && p.x + .24 < tx + 1 && p.y + .88 > ty && p.y + .5 < ty + 1) return { ok: false, message: "Step back a little to build there." };
    tiles.push({ tx, ty, sides: [ox === 0 && "west", ox === N - 1 && "east", oy === 0 && "north", oy === N - 1 && "south"].filter((sd) => sd && sd !== open) });
  }
  if (builds.length >= BUILD.maxOut) breakBuild(game, builds[0]);
  for (const [mat, need] of Object.entries(cost)) m[mat] = (Number(m[mat]) || 0) - need;
  const id = `enclosure-${(game.buildSeq = (game.buildSeq || 0) + 1)}`, orig = {};
  for (const q of tiles) { const i = q.ty * w + q.tx; orig[i] = game.map.tiles[i]; game.map.tiles[i] = { ...game.map.tiles[i], enclosure: id, encSides: q.sides }; }
  const pen = { id, kind: "enclosure", x: x0, y: y0, size: N, open, hits: K.hits, life: K.life, orig, trapped: null, cost: { ...cost } }; builds.push(pen);
  changedBuilds(game);
  // Release 697: built across another pen's opening, it closes that pen: whatever is inside is shut in (game.penClosed rolls the trap).
  // Release 748: game.penClosed may answer { message, undo }: "refund" (no try was made: the closing pen comes down and its materials
  // come back; `also` pens with it), or "crumble" (the beast slipped out: the closing pen and `also` break, their materials lost).
  let said = null;
  for (const other of [...builds]) if (other !== pen && other.kind === "enclosure" && !other.trapped && builds.includes(other) && overlapsOpening(other, pen)) {
    const r = game.penClosed?.(other, pen); if (!r) continue;
    if (typeof r === "string") { said = r; continue; }
    said = r.message;
    if (r.undo === "refund") for (const b of [pen, ...(r.also || [])]) dismantlePen(game, b, true);
    else if (r.undo === "crumble") for (const b of [pen, ...(r.also || [])]) dismantlePen(game, b, false);
  }
  return { ok: true, message: said || `${N > ENCLOSURE.size ? `A ${N}×${N} enclosure` : "Enclosure"} raised, open to the ${open}. ${m.wood} wood, ${m.stone} stone, ${m.cinderIron} cinder iron left.` };
}
// Release 748: takes a pen down cleanly (its tiles as they were); `refund` gives back what it cost.
export function dismantlePen(game, b, refund = false) {
  if (!breakBuild(game, b)) return false;
  if (refund) { const m = (game.save.materials ||= {}); for (const [mat, n] of Object.entries(b.cost || BUILD.kinds.enclosure.cost)) m[mat] = (Number(m[mat]) || 0) + n; }
  return true;
}
// The two tiles just outside a pen's opening, and whether another pen's 2x2 covers either.
export const penSide = (b) => Math.max(ENCLOSURE.size, Math.floor(Number(b?.size) || ENCLOSURE.size)); // release 748: pens bigger than 2x2
export function openingTiles(b) { const n = penSide(b), run = Array.from({ length: n }, (_, i) => i); return { north: run.map((i) => [b.x + i, b.y - 1]), south: run.map((i) => [b.x + i, b.y + n]), west: run.map((i) => [b.x - 1, b.y + i]), east: run.map((i) => [b.x + n, b.y + i]) }[b.open] || []; }
export function overlapsOpening(b, other) { const n = penSide(other); return openingTiles(b).some(([x, y]) => x >= other.x && x < other.x + n && y >= other.y && y < other.y + n); }
// The pen whose square holds the point (tile space), if any.
export function enclosureAt(game, px, py) { return (game.builds || []).find((b) => { const n = b.kind === "enclosure" && penSide(b); return n && px >= b.x && px < b.x + n && py >= b.y && py < b.y + n; }) || null; }
export const enclosuresStanding = (game) => (game.builds || []).filter((b) => b.kind === "enclosure").length;
// The Wayfarer's pen, by the middle of their feet.
export function playerEnclosure(game) { const p = game.player; return enclosureAt(game, p.x + .5, p.y + .75); }
// Each frame: the guard runs down while they are inside, and comes back after `recharge` s outside.
export function tickEnclosureGuard(game, dt) {
  const g = (game.encGuard ||= { left: ENCLOSURE.guard, out: ENCLOSURE.recharge }), inside = playerEnclosure(game);
  if (inside) { g.left = Math.max(0, g.left - dt); g.out = 0; } else { g.out += dt; if (g.out >= ENCLOSURE.recharge) g.left = ENCLOSURE.guard; }
}
// Does the pen turn a blow from `from` (a point in tile space)? Only while the guard lasts, and never from the open side.
export function enclosureShields(game, from) {
  const b = playerEnclosure(game); if (!b || !from || !((game.encGuard?.left ?? ENCLOSURE.guard) > 0)) return false;
  const n = penSide(b), open = { north: from.y < b.y, south: from.y > b.y + n, west: from.x < b.x, east: from.x > b.x + n }[b.open];
  const within = from.x >= b.x && from.x < b.x + n && from.y >= b.y && from.y < b.y + n;
  return !open && !within; // a blow from the open side, or from inside the pen itself, is not turned
}
