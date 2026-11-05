// The tree package (release 645, landscape version 13). Tim, 2026-11-01: "make a tree package, so we can have different
// branches and different configurations... deterministically... not all trees are the same... like every dungeon is kind of
// different... multiple trees... canopy level... branches don't really have any leaves... not all branches need to be blocks...
// platforms you could land on if you were to fall from above."
//
// Version 12's single great tree (landscape.ts, buildCanopyTree) is kept for the sections pinned to it. From version 13 a
// jungle section that grows a great tree grows one of the FORMS below, every part of it hashed from the seed and section:
// - a spire: one tall tree, climbed branch by branch round its trunk to the crown and its door (as in version 12), but turned
//   and mirrored any of eight ways, wound round three or four sides, with its own reach on every side and its own bark and leaves;
// - a grove: a lesser tree climbed to its crown, then a canopy walk of leaf platforms hopped one level at a time across the
//   gaps between them to a second, greater tree, whose branches carry the climb on above to its crown and its door.
// Every tree also wears:
// - perches (`pads`): single leaf platforms in the gaps between its branches, level with the branch below and two or three
//   levels under the branch above, so a fall off the higher branch lands on one (it hurts) and the climb goes on from there;
// - leaves on its branches (the tips always), and decorative boughs drawn off its trunk, which nothing walks on.
// Bounded: at most two trees, a few thousand tile checks, once per section; nothing spawns up there.
import { hashSeed, byHash } from "./random.js?v=r771-ca5838cab376";

export const TREE_VERSION = 13;
// Release 672 (landscape version 14; Tim, 2026-11-01: "I haven't seen any tall trees"): a survey found the version 13 search
// tried only `tries` hashed spots, most of them on the plaza or an exit line, so only about one jungle section in seven that
// passed `chance` grew a tree. From version 14 every spot is tried in a hashed order (a spire's plan is a few dozen tile checks,
// and at most `layouts` laid plans are tested for walling ground off), and great trees also grow in forests and amberwood,
// each region with its own chance. Version 13 sections keep the old search and region.
export const TREES_V14 = {
  version: 14, layouts: 60,
  regions: { jungle: { chance: .6, ground: ["jungleFloor", "jungleMire", "buttressRoot"] }, forest: { chance: .3, ground: ["forestFloor"] }, amber: { chance: .4, ground: ["amberLitter"] } },
  minTiles: 120, // a section needs this much of one region's ground to try
  compact: { trunk: [2, 3], sides: [3], reach: [2, 5] }, // where no spire fits: a smaller tree, climbed round three sides
};
// Great-tree platforming review (Tim, 2026-11-05: "the brown portions that look like platforms should be what you can walk on...
// I got through the trunk to the tops of the platforms and then there was nothing"; "make them taller... vary heights"). From
// landscape version 18 a tree keeps version 14's search and chance (wonders.ts predicts it unchanged) but is laid so that what
// is drawn is what is walked: perches never hang right behind (north of) a higher branch, where the branch's drawn face would
// hide them; the hop gap between twin tips is open ground, cleared of trees; the forest's own trees are cleared from the strip
// the trunk is drawn up (its columns, `drawnLevel` tiles a level above the trunk), so nothing stands in front of it; a tree
// takes only the turns whose twin branches do not hide one another (`turns`) and its corner knots are slope tiles (drawn half a
// level lower, so a knot no longer sits over the branch root behind it); and the climbs reach longer (`specs`), so trees stand
// taller and their heights vary more (a spire 37 to 61 levels, a compact tree 22 to 34). Version 14 to 17 sections keep their
// trees exactly.
export const TREES_V18 = {
  version: 18,
  specs: { spire: { trunk: 3, sides: [4], reach: [4, 7] }, compact: { trunk: [2, 3], sides: [3], reach: [3, 5] }, lesser: { trunk: [2, 3], sides: [3], reach: [3, 4] }, greater: { trunk: 3, sides: [3, 4], reach: [4, 5] } },
  drawnLevel: .68, // tiles a canopy level is drawn tall (landscape.ts LIFT_PER_LEVEL × CANOPY_LIFT; a test keeps them equal)
  columnPad: 1, // the cleared strip reaches this many tiles past the trunk's sides, and this many rows above its drawn top
  // The turns a tree may take, by its number of sides. Drawn from above, a platform three levels higher and two rows nearer the
  // camera sits exactly over the one behind it, so a twin branch that returns south of the branch it left hides that branch's
  // last tile but one; one such side is unavoidable in any turn. The crown hides a slope tile right behind (north of) it the same
  // way, and the trunk drawn on above the crown hides whatever climbs north of it up there, so the last side never comes from
  // the north. Turns 0 and 1 (three sides: the hidden tile on the first side, at most four levels up; the climb ends from the
  // east or west) and 6 and 7 (four sides: the hidden tile on the second side; the climb ends from the east or west).
  turns: { 3: [0, 1], 4: [6, 7] },
};
// Tall spires again (Tim, 2026-11-05: "For trees, let's keep it as it was before. I like having tall spires"). Version 18
// raised a spire's shortest side to four tiles (`specs`), so few spots took a spire and compact trees grew in their place (39
// spires, 121 compact and 1 grove in 150 trees, where versions 14 to 17 grew 62, 90 and 8), and a grove gave up its spot when
// its first walk ran under the greater tree's branches or walled ground off. From landscape version 19 every version 18 rule
// holds (readable turns, open and cleared hop gaps, perches in the open, the trunk's strip cleared, slope knots, nothing where the
// Far Sleep dreams), and a section tries, in order: a grove (`forms`, `tries`, `greaterTries`; a greater tree whose walk lies
// under its branches or walls ground off is passed over for the next spot), a tall spire (every side at least `specs.tall`
// reach), a spire (the earlier three-tile reach, but the second side of a four-sided tree keeps four: `least`), then a compact
// tree; each spot in every readable turn (`allTurns`, the hashed turn first). Measured over 850 trees on three seeds: 348
// spires, 472 compact, 30 groves (versions 14 to 17: 418, 390, 42; version 18 about 1 spire in 4 and almost no groves), every
// one climbed to its crown. Version 18 and older sections keep their trees exactly.
export const TREES_V19 = {
  version: 19, allTurns: true,
  forms: [["grove", 1]], // every section tries a grove first (most spots cannot take one), then a spire, then a compact tree
  specs: { tall: { trunk: 3, sides: [4], reach: [4, 7] }, spire: { trunk: 3, sides: [4], reach: [3, 7], least: { 4: [3, 4, 3, 3] } }, compact: { trunk: [2, 3], sides: [3], reach: [3, 5] }, lesser: { trunk: [2, 3], sides: [3], reach: [3, 4] }, greater: { trunk: 3, sides: [3, 4], reach: [3, 5], least: { 4: [3, 4, 3, 3] } } },
  // `least`, by number of sides: the second side of a four-sided tree keeps four tiles (at three, the corner knot before it is
  // drawn over as well as the one tile its twin nearer the camera always covers; the other sides may be three)
  tries: { spire: 80, grove: 480 }, greaterTries: 240, // spots tried for a grove's first tree, and for its second (version 18: 240 and 120)
};
// The last spires back (Tim, 2026-11-05: "sure, we can have those two hidden climb tiles... if it doesn't break the tree — it
// doesn't make the user feel like they're going to die, or unsure how to traverse it concretely — then we can put them in").
// Version 19's `least` kept the second side of a four-sided tree at four tiles, because at three the corner knot before it is
// drawn over by the branch that returns two rows nearer the camera (and the next step south of it), and that cost about one
// spire in six. From landscape version 20 every side may be three tiles again (no `least`), and the knot is drawn: a walkable
// tile that later wood hides whole is painted again over the far wood, with the steps beside it painted back over it, when that
// shows it without hiding anything else (`canopyRepaint`, every tree, rendering only). And a tree is laid only when, so drawn,
// every climb tile shows but the one twin-covered tile a tree always has (`readable`); otherwise the spot is passed over.
export const TREES_V20 = {
  ...TREES_V19, version: 20,
  specs: { tall: TREES_V19.specs.tall, spire: { trunk: 3, sides: [4], reach: [3, 7] }, compact: TREES_V19.specs.compact, lesser: TREES_V19.specs.lesser, greater: { trunk: 3, sides: [3, 4], reach: [3, 5] } },
  readable: { perTree: 1 }, // walkable tiles a laid tree may leave hidden, per tree (the tile its twin tip sits exactly over)
};
// What the renderer draws where (landscape-render.ts, renderer.ts), as rectangles in tile units, so the generator and the
// renderer agree on which platforms show. A canopy tile's top face sits `drawnLevel` tiles a level higher (half a level lower for
// a slope); under it, the trunk's face runs down to its foot, a branch's underside .26 deep, a leaf's .14. The ground pass paints
// row by row, so a tile further south (nearer the camera) is painted over the ones behind it.
export const CANOPY_DRAWN = {
  under: { canopyLeaf: .14, other: .26 }, samples: 8, // the top face is sampled samples × samples
  hidden: .95, // a top face covered this much is hidden
  keep: .25, // a repaint may not leave another platform less than this much of its face (a one-level stair shows .32)
};
const drawnLift = (t) => Math.max(0, (t.elev || 0) - (t.slope ? .5 : 0)) * TREES_V18.drawnLevel;
const drawnRects = (t, x, y) => { const h = drawnLift(t), top = [x, y - h, x + 1, y - h + 1]; return [top, h <= 0 ? null : t.kind === "canopyTrunk" ? [x, y - h + 1, x + 1, y + 1] : [x, y - h + 1, x + 1, y - h + 1 + (CANOPY_DRAWN.under[t.kind] ?? CANOPY_DRAWN.under.other)]]; };
const meets = (a, b) => !!b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
// Release 758's list (moved here from landscape-render.ts, unchanged): the platforms whose drawn top or underside lies within a
// trunk face drawn after them, painted again over it.
export function canopyBehindTrunk(tiles, w, box) {
  const out = [], h = Math.floor(tiles.length / w);
  for (let x = Math.max(0, box.x); x < Math.min(w, box.x + box.n); x++) {
    const trunks = []; for (let y = Math.max(0, box.y); y < Math.min(h, box.y + box.n); y++) { const u = tiles[y * w + x]; if (u?.kind === "canopyTrunk" && u.canopy) trunks.push({ y, top: y - drawnLift(u) + 1, bottom: y + 1 }); } // the face: below the crown's own top face, which stays in front of what is behind it
    if (!trunks.length) continue;
    for (let y = Math.max(0, box.y); y < Math.min(h, box.y + box.n); y++) {
      const t = tiles[y * w + x]; if (!t?.canopy || t.kind === "canopyTrunk" || t.blocked) continue;
      const top = y - drawnLift(t), bottom = top + 1.26; // its top face and underside
      if (trunks.some((u) => u.y > y && bottom > u.top && top < u.bottom)) out.push(t);
    }
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
// Release 758's other list (moved here from landscape-render.ts, unchanged): the platforms a tree's rising trunk (drawn on above
// the crown with the actors, renderer.ts drawCanopyDressing) would cover, canopy tiles north of the trunk in its columns whose
// drawn top lies above the crown's, painted again right after the dressing.
export function canopyAboveCrown(tiles, w, tr) {
  const out = [], h = Math.floor(tiles.length / w), topY = tr.y0 - tr.top * TREES_V18.drawnLevel;
  for (let x = Math.max(0, tr.x0); x < Math.min(w, tr.x0 + tr.size); x++) for (let y = 0; y < Math.min(h, tr.y0); y++) {
    const t = tiles[y * w + x]; if (!t?.canopy || t.kind === "canopyTrunk" || t.blocked) continue;
    if (y - drawnLift(t) < topY) out.push(t);
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
// The tree's repaint, in order: release 758's platforms behind the trunk (shaded), then each walkable tile that wood painted
// after it still hides whole (`hidden`), painted again (shaded, "behind") with the steps beside it that it overlaps painted back
// over it (unshaded), kept only when that shows the tile and leaves every other platform at least `keep` of its face (or what
// it had). `hiddenAfter` lists the walkable tiles that stay hidden once `last` (the above-crown list, painted after the dressing)
// is painted too; the plan does not depend on `last`. Pure; about a hundred tiles, worked out once a map.
export function canopyRepaint(tiles, w, box, last = []) {
  const D = CANOPY_DRAWN, h = Math.floor(tiles.length / w), wood = [], pos = new Map();
  for (let y = Math.max(0, box.y); y < Math.min(h, box.y + box.n); y++) for (let x = Math.max(0, box.x); x < Math.min(w, box.x + box.n); x++) { const t = tiles[y * w + x]; if (t?.canopy) { wood.push(t); pos.set(t, [x, y]); } }
  const rects = new Map(wood.map((t) => [t, drawnRects(t, ...pos.get(t))])), order = new Map(wood.map((t) => [t, pos.get(t)[1] * w + pos.get(t)[0]])), plan = [];
  let next = 1e6; for (const t of canopyBehindTrunk(tiles, w, box)) { order.set(t, next++); plan.push({ t, shade: true }); }
  const walk = wood.filter((t) => t.kind !== "canopyTrunk" && !t.blocked), S = D.samples;
  const cover = (t) => { const top = rects.get(t)[0], over = []; for (const u of wood) { if (u === t || order.get(u) <= order.get(t)) continue; for (const r of rects.get(u)) if (meets(top, r)) over.push(r); } if (!over.length) return 0; let n = 0; for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) { const px = top[0] + (i + .5) / S, py = top[1] + (j + .5) / S; if (over.some((r) => px >= r[0] && px < r[2] && py >= r[1] && py < r[3])) n++; } return n / (S * S); };
  const was = new Map(walk.map((t) => [t, cover(t)]));
  for (const t of walk.filter((q) => was.get(q) >= D.hidden).sort((a, b) => pos.get(a)[1] - pos.get(b)[1] || pos.get(a)[0] - pos.get(b)[0])) {
    if (cover(t) < D.hidden) continue; // shown by an earlier repaint
    const [x, y] = pos.get(t), top = rects.get(t)[0], old = order.get(t), back = [];
    for (const [dx, dy] of N4) { const n = tiles[(y + dy) * w + x + dx]; if (x + dx < 0 || x + dx >= w || !n?.canopy || n.kind === "canopyTrunk" || !order.has(n) || Math.abs((n.elev || 0) - (t.elev || 0)) > 1 || order.get(n) <= old || !rects.get(n).some((r) => meets(top, r))) continue; back.push(n); }
    const prior = new Map(back.map((n) => [n, order.get(n)])); order.set(t, next); back.sort((a, b) => order.get(a) - order.get(b)).forEach((n, i) => order.set(n, next + 1 + i));
    const near = walk.filter((q) => q !== t && [t, ...back].some((u) => rects.get(u).some((r) => meets(rects.get(q)[0], r)))); // the faces this repaint can cover
    if (cover(t) < D.hidden && near.every((q) => 1 - cover(q) >= Math.min(D.keep, 1 - was.get(q)))) { next += 1 + back.length; plan.push({ t, shade: true }, ...back.map((n) => ({ t: n, shade: false }))); for (const q of near) was.set(q, cover(q)); }
    else { order.set(t, old); for (const [n, o] of prior) order.set(n, o); }
  }
  for (const t of last) if (order.has(t)) order.set(t, next++);
  return { plan, hiddenAfter: walk.filter((t) => cover(t) >= D.hidden) };
}
export const TREES = {
  chance: .55, // of the jungle sections the great trees are seen in at all
  forms: [["spire", 4], ["grove", 6]], // weights (a grove needs room for two trees, so it is tried more often than it grows)
  tries: { spire: 80, grove: 240 }, // spots tried for a spire, or for a grove's first tree
  greaterTries: 120, // spots tried for a grove's second tree
  starfield: .5, // the door's destination: a Starfield crossing, else a cloud hold
  spire: { trunk: 3, sides: [4], reach: [3, 7] },
  lesser: { trunk: [2, 3], sides: [3], reach: [3, 4] }, // a grove's first tree
  greater: { trunk: 3, sides: [3, 4], reach: [3, 5] }, // a grove's second tree, with the door
  walk: { min: 3, max: 22, gapEvery: 2 }, // the canopy walk: its length, and at most a gap every this many platforms
  pads: { max: 4, fall: [2, 3] }, // perches per tree, and how far under the branch above they hang
  leaves: { branch: .3 }, // the share of plain branch tiles that carry leaves (tips always do)
  boughs: { count: [5, 9], len: [1.6, 3.6] }, // decorative boughs per tree and their reach in tiles
  looks: [ // bark (light, dark) and leaves, and a tint laid over the tree's tiles
    { name: "greenheart", bark: ["#6b4a2c", "#3e2916"], leaf: ["#2c6326", "#3f8a35", "#1f4a1a", "#4f9a3f"], tint: null },
    { name: "redwood", bark: ["#8a4a30", "#4a2116"], leaf: ["#2f5e2a", "#477d34", "#25481f", "#5d9446"], tint: "#a8483022" },
    { name: "silverbark", bark: ["#b8b3a4", "#6f6a5e"], leaf: ["#2d6a5a", "#3f8a78", "#1f4a40", "#5aa890"], tint: "#e8e4d822" },
    { name: "emberleaf", bark: ["#4a3426", "#24170e"], leaf: ["#8a3a1c", "#b5562a", "#5e2414", "#d27a3a"], tint: "#20100822" },
  ],
};

const idx = (x, y) => y * 32 + x;
// hashSeed (random.ts) carried on from a prefix's state: fnvFrom(fnvFrom(2166136261, a), b) >>> 0 === hashSeed(a + b). The tree
// hashes share one long prefix, worked out once a section (the same hashes, sooner).
const fnvFrom = (state, text) => { let h = state; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h; };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const pick = (n, [lo, hi]) => lo + n % (hi - lo + 1);
const weighted = (n, list) => { const total = list.reduce((a, [, w]) => a + w, 0); let r = n % total; for (const [k, w] of list) { if (r < w) return k; r -= w; } return list[0][0]; };

// The four sides of a trunk `N` square at the origin, in climbing order: the outward direction, the side's first and last
// column (from the previous corner round to the next), and the corner knot that leads to the next side.
const SIDES = (N) => [
  { d: [1, 0], a: [N, 0], b: [N, N - 1], knot: [N, N] },
  { d: [0, 1], a: [N - 1, N], b: [0, N], knot: [-1, N] },
  { d: [-1, 0], a: [-1, N - 1], b: [-1, 0], knot: [-1, -1] },
  { d: [0, -1], a: [0, -1], b: [N - 1, -1], knot: null }];
// One of eight turns and mirrorings of the trunk square onto the section (the square maps onto itself).
const turn = (op, N, tx, ty) => (lx, ly) => { let x = lx, y = ly; if (op & 4) [x, y] = [y, x]; if (op & 1) x = N - 1 - x; if (op & 2) y = N - 1 - y; return [tx + x, ty + y]; };
const turnDir = (op) => ([dx, dy]) => { let x = dx, y = dy; if (op & 4) [x, y] = [y, x]; if (op & 1) x = -x; if (op & 2) y = -y; return [x, y]; };

// Plan one tree's climb: where its branches go and how long each side's are, or null when the ground will not take it. Version
// 19 passes `alts` (the readable turns, tried from the hashed one on) and `ok` (the first plan it accepts is returned); before,
// one turn and any plan. The hashes do not depend on the turn, so they are taken once.
function planTree(h, key, spec, ground, tx, ty, gapOk = null, turns = null, alts = 1, ok = (p) => !!p) {
  const N = Array.isArray(spec.trunk) ? pick(h(`${key}:n`), spec.trunk) : spec.trunk;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!ground(tx + i, ty + j)) return null; // every turn maps the trunk square onto itself
  const count = spec.sides[h(`${key}:sides`) % spec.sides.length], h0 = h(`${key}:op`), wants = [], look = h(`${key}:look`) % TREES.looks.length;
  const least = (k) => spec.least?.[count]?.[k] ?? spec.reach[0]; // version 19: `least`, a side's own shortest reach (before, the spec's)
  for (let alt = 0; alt < alts; alt++) {
    const op = turns ? turns[count][(h0 + alt) % turns[count].length] : h0 % 8, W = turn(op, N, tx, ty), D = turnDir(op); // version 18: only the readable turns (TREES_V18.turns)
    const sides = []; let fit = true;
    for (let k = 0; k < count && fit; k++) {
      const sd = SIDES(N)[k], d = D(sd.d), a = W(...sd.a), b = W(...sd.b), knot = k < count - 1 ? W(...sd.knot) : null, want = wants[k] ??= pick(h(`${key}:r${k}`), [least(k), spec.reach[1]]); let L = 0;
      for (let r = 0; r < want; r++) { if (![a, b].every(([x, y]) => ground(x + d[0] * r, y + d[1] * r))) break; L = r + 1; }
      if (L < least(k) || (knot && !ground(...knot))) { fit = false; break; }
      // Version 18: the gap hopped between the twin tips is open ground (a blocked root or a pool there would stop the hop).
      const gap = []; for (let g = 1; g < N - 1; g++) gap.push([a[0] + d[0] * (L - 1) + (b[0] - a[0]) * g / (N - 1), a[1] + d[1] * (L - 1) + (b[1] - a[1]) * g / (N - 1)]);
      if (gapOk && !gap.every(([x, y]) => gapOk(x, y))) { fit = false; break; }
      sides.push({ d, a, b, knot, L, gap });
    }
    if (!fit) continue;
    const plan = { N, op, tx, ty, sides, step: W(SIDES(N)[0].a[0], -1), look, tiles: [] }; // step: the ground beside the first branch, where the climb starts
    if (ok(plan)) return plan;
  }
  return null;
}

// The tiles of a planned climb from `start` (the first tile flat, then rising one level a tile; a hop between the twin tips).
function climbTiles(plan, start) {
  const out = [], hops = []; let lv = start - 1;
  for (const sd of plan.sides) {
    const at = ([x, y], r) => [x + sd.d[0] * r, y + sd.d[1] * r];
    for (let r = 0; r < sd.L; r++) { lv++; out.push({ p: at(sd.a, r), elev: lv, slope: lv !== start, tip: r === sd.L - 1 }); }
    lv++; hops.push([at(sd.a, sd.L - 1), at(sd.b, sd.L - 1)]);
    for (let r = sd.L - 1; r >= 0; r--) { out.push({ p: at(sd.b, r), elev: lv, slope: true, tip: r === sd.L - 1 }); if (r) lv++; }
    if (sd.knot) { lv++; out.push({ p: sd.knot, elev: lv, slope: false, knot: true }); }
  }
  return { tiles: out, hops, top: lv + 1 };
}

// Version 20: a laid tree's wood, drawn as the renderer draws it (the repaint, then the above-crown list), hides at most
// `readable.perTree` walkable tiles a tree, each one its twin tip sits exactly over. The box is the one map.canopy will record.
function readableTree(map, laid, trees) {
  const door = trees[trees.length - 1], last = canopyAboveCrown(map.tiles, 32, { x0: door.tx, y0: door.ty, size: door.N, top: door.top }), xs = [...laid].map((i) => i % 32), ys = [...laid].map((i) => Math.floor(i / 32)), bx = Math.min(...xs) - 1, by = Math.min(...ys) - 1, n = Math.max(Math.max(...xs) - bx, Math.max(...ys) - by) + 2;
  const hidden = canopyRepaint(map.tiles, 32, { x: bx, y: by, n }, last).hiddenAfter; // each the tile its twin tip sits exactly over (two rows nearer the camera, three levels up)
  return hidden.length <= TREES_V20.readable.perTree * trees.length && hidden.every((t) => { const s = map.tiles[idx(t.x, t.y + 2)]; return t.y + 2 < 32 && !!s?.canopy && s.elev === t.elev + 3; });
}

// The shortest walk over free ground from any of `from` to a tile beside `to`, or null.
function walkPath(from, to, free) {
  const prev = new Map(), q = []; for (const p of from) if (free(...p)) { prev.set(idx(...p), null); q.push(p); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i]; if (Math.abs(x - to[0]) + Math.abs(y - to[1]) === 1) { const path = []; let k = idx(x, y); while (k != null) { path.unshift([k % 32, Math.floor(k / 32)]); k = prev.get(k); } return path; }
    for (const [dx, dy] of N4) { const n = [x + dx, y + dy], k = idx(...n); if (!prev.has(k) && free(...n)) { prev.set(k, idx(x, y)); q.push(n); } }
  }
  return null;
}

// Grow this section's great tree(s). `ground` says whether a tile can take wood, `reachable` recomputes what can be walked
// to from the plaza, `trapped` lists the tiles that can be dropped into but not climbed out of. Returns the tree record for map.canopy, or null (the tiles are left as they were).
export function growTrees(map, seed, rx, ry, { ground, reachable, trapped, version = 13, region = "jungle", force = false }) {
  const T = TREES, h0 = fnvFrom(2166136261, `${seed}:trees:v13:${rx}:${ry}:`), h = (k) => fnvFrom(h0, k) >>> 0, at = (x, y) => map.tiles[idx(x, y)], v14 = version >= TREES_V14.version, v18 = version >= TREES_V18.version, v19 = version >= TREES_V19.version, v20 = version >= TREES_V20.version;
  const S = v20 ? TREES_V20.specs : v19 ? TREES_V19.specs : v18 ? TREES_V18.specs : { spire: T.spire, compact: TREES_V14.compact, lesser: T.lesser, greater: T.greater }, gapOk = v18 ? (x, y) => ground(x, y) && !at(x, y).blocked : null, turns = v18 ? TREES_V18.turns : null; // version 18: longer climbs, open hop gaps (a buttress root is tree ground, but blocked as a gap), readable turns
  if (!force && !v14 && (hashSeed(`${seed}:canopy-grow:v1:${ry * 7919 + rx}`) % 1000) / 1000 >= T.chance) return null;
  if (!force && v14 && (hashSeed(`${seed}:canopy-grow:v2:${region}:${ry * 7919 + rx}`) % 1000) / 1000 >= (TREES_V14.regions[region]?.chance || 0)) return null; // force: the Rite of Ascendancy's tree (ascendancy.ts) always grows where it fits
  // Version 14: every spot, in a hashed order (the same each time); version 13: `tries` hashed spots.
  const spots = v14 ? Array.from({ length: 26 * 26 }, (_, i) => [2 + i % 26, 2 + Math.floor(i / 26)]).sort(byHash((p) => `${seed}:tree-spot:v14:${rx}:${ry}:${p}`)) : null;
  let layouts = 0;
  const maxLayouts = TREES_V14.layouts, tries = v19 ? TREES_V19.tries : T.tries, greaterTries = v19 ? TREES_V19.greaterTries : T.greaterTries; // version 19: more grove spots
  const alts = v19 && TREES_V19.allTurns ? Math.max(...Object.values(turns).map((l) => l.length)) : 1; // version 19: a spot is tried in every readable turn, the hashed one first
  const plan = (key, spec, gr, x, y, gap, ok) => planTree(h, key, spec, gr, x, y, gap, turns, alts, ok);
  const before = reachable(map), stuck = new Set(trapped(map).map((t) => idx(t.x, t.y))); // wood never walls ground off, nor makes a pit you can drop into and not climb out of
  const cutsOff = (laid) => { const r = reachable(map); for (let i = 0; i < 1024; i++) if (before[i] && !r[i] && !laid.has(i)) return true; return trapped(map).some((t) => !stuck.has(idx(t.x, t.y))); };
  const first = weighted(h("form"), v19 ? TREES_V19.forms : T.forms), spire = v19 ? ["tall", "spire"] : ["spire"], forms = [...(first === "grove" ? ["grove", ...spire] : spire), ...(v14 ? ["compact"] : [])]; // version 19: a spire first where every side takes its tall reach, then anywhere one fits
  for (const pass of forms) for (let t = 0; t < (v14 && pass !== "grove" ? spots.length : tries[pass]); t++) {
    if (v14 && layouts >= maxLayouts) break;
    const form = pass === "tall" ? "spire" : pass, shape = form === "compact" ? "spire" : form, spec = pass === "tall" ? S.tall : form === "compact" ? S.compact : S.spire;
    const [tx, ty] = v14 && form !== "grove" ? spots[t] : [2 + h(`${form}:x${t}`) % 26, 2 + h(`${form}:y${t}`) % 26];
    if (!ground(tx, ty)) continue; // every trunk square covers its spot, so no plan fits here (a quick skip: the same trees)
    const saved = new Map(), laid = new Set(), keep = (x, y) => { if (!saved.has(idx(x, y))) saved.set(idx(x, y), { ...at(x, y) }); };
    const put = (x, y, props) => { keep(x, y); Object.assign(at(x, y), { blocked: false, canopy: true, skyPlatform: true, ...props }); laid.add(idx(x, y)); };
    const undo = () => { for (const [i, t0] of saved) { const tile = map.tiles[i]; for (const k of Object.keys(tile)) delete tile[k]; Object.assign(tile, t0); } };
    const free = (x, y) => ground(x, y) && !laid.has(idx(x, y));
    const layTree = (plan, start, key) => {
      const c = climbTiles(plan, start);
      for (const q of c.tiles) put(...q.p, { kind: "canopyBranch", elev: q.elev, slope: q.slope || (v18 && !!q.knot), look: plan.look, ...(q.tip ? { leaves: 2 } : h(`${key}:leaf:${q.p}`) % 1000 < T.leaves.branch * 1000 ? { leaves: 1 } : {}) }); // version 18: a knot is a slope tile too (drawn half a level lower, so it no longer sits over the branch root behind it; the steps onto and off it are the same)
      for (let j = 0; j < plan.N; j++) for (let i = 0; i < plan.N; i++) { const [x, y] = turn(plan.op, plan.N, plan.tx, plan.ty)(i, j); put(x, y, { kind: "canopyTrunk", elev: c.top, slope: false, look: plan.look }); }
      plan.top = c.top; plan.hops = c.hops; plan.climb = c.tiles; return c;
    };
    const fits = (plan) => plan && plan.sides.every((sd) => [sd.a, sd.b].every(([x, y]) => { for (let r = 0; r < sd.L; r++) if (!free(x + sd.d[0] * r, y + sd.d[1] * r)) return false; return true; }) && (!sd.knot || free(...sd.knot)));
    const trees = [], walk = [], hops = []; let laidB = false; // laidB: version 19 laid the grove's walk and greater tree, and tested them for walling ground off, while choosing it
    if (shape === "spire") {
      const p = plan(`${form}:${t}`, spec, ground, tx, ty, gapOk, (q) => q && free(...q.step)); if (!p) continue;
      layTree(p, 1, `${form}:${t}`); trees.push(p);
    } else {
      const a = plan(`lesser:${t}`, S.lesser, ground, tx, ty, gapOk, (q) => q && free(...q.step)); if (!a) continue;
      layTree(a, 1, `lesser:${t}`);
      // The greater tree: the first of a few dozen hashed spots its climb fits at, with a canopy walk to it from the lesser crown.
      const edge = []; for (let j = -1; j <= a.N; j++) for (let i = -1; i <= a.N; i++) if ((i < 0 || j < 0 || i >= a.N || j >= a.N) && !((i < 0 || i >= a.N) && (j < 0 || j >= a.N))) edge.push(turn(a.op, a.N, a.tx, a.ty)(i, j));
      const trunkA = new Set(); for (let j = 0; j < a.N; j++) for (let i = 0; i < a.N; i++) trunkA.add(idx(...turn(a.op, a.N, a.tx, a.ty)(i, j)));
      let b = null, path = null;
      // The canopy walk: leaf platforms level with the lesser crown, a gap (hopped one level up) every few platforms; then the greater tree.
      const layWalk = (q, w) => {
        walk.length = 0; hops.length = 0; let e = a.top, since = 0;
        for (let i = 0; i < w.length; i++) {
          const [x, y] = w[i], p0 = w[i - 1], p1 = w[i + 1], straight = p0 && p1 && p1[0] - x === x - p0[0] && p1[1] - y === y - p0[1];
          if (straight && since >= T.walk.gapEvery && i >= 2 && i < w.length - 2) { hops.push([p0, p1]); e++; since = 0; continue; }
          put(x, y, { kind: "canopyLeaf", elev: e, slope: false, look: a.look, walk: true }); walk.push([x, y]); since++;
        }
        layTree(q, e + 1, `greater:${t}`);
      };
      // Version 18: no platform of the walk may lie where a higher branch of the greater tree, further south, is drawn over it
      // (a tile k rows nearer the camera and d levels higher covers the one behind it when k - d × drawnLevel is within its face).
      const underBranch = () => v18 && walk.some(([x, y]) => { const w = at(x, y); for (let k = 1; k <= 14 && y + k < 32; k++) { const p = at(x, y + k); if (!p?.canopy || !laid.has(idx(x, y + k))) continue; const off = k - ((p.elev - (p.slope ? .5 : 0)) - w.elev) * TREES_V18.drawnLevel; if (off > -1.26 && off < 1) return true; } return false; });
      // A bound on every walk, so spots no walk can reach are not planned (the same trees, found sooner): its length over the ground
      // open before a greater tree is planned (planning one only closes more), from the lesser crown to beside the spot's trunk.
      const reach0 = new Int16Array(1024), q0 = [], open0 = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 32 && free(x, y) && !N4.some(([dx, dy]) => laid.has(idx(x + dx, y + dy)) && !trunkA.has(idx(x + dx, y + dy)));
      for (const p of edge) if (open0(...p) && !reach0[idx(...p)]) { reach0[idx(...p)] = 1; q0.push(p); }
      for (let i = 0; i < q0.length; i++) { const [x, y] = q0[i], d = reach0[idx(x, y)]; if (d >= T.walk.max) continue; for (const [dx, dy] of N4) if (open0(x + dx, y + dy) && !reach0[idx(x + dx, y + dy)]) { reach0[idx(x + dx, y + dy)] = d + 1; q0.push([x + dx, y + dy]); } }
      const near = (x, y) => { for (let j = Math.max(0, y - 2); j <= Math.min(31, y + 4); j++) for (let i = Math.max(0, x - 2); i <= Math.min(31, x + 4); i++) if (reach0[idx(i, j)]) return true; return false; }; // a trunk at most 3 square from (x, y), its first branch beside it, the walk's end beside that
      for (let k = 0; k < greaterTries && !path && q0.length; k++) {
        const gx = 2 + h(`greater:x${t}:${k}`) % 26, gy = 2 + h(`greater:y${t}:${k}`) % 26; if (!free(gx, gy) || !near(gx, gy)) continue;
        const q = plan(`greater:${t}:${k}`, S.greater, free, gx, gy, v18 ? (x, y) => free(x, y) && !at(x, y).blocked : null, fits); if (!fits(q)) continue;
        const planned = new Set(), c = climbTiles(q, 1); for (const r of c.tiles) planned.add(idx(...r.p)); for (const [p, q2] of c.hops) planned.add(idx((p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2)); for (let j = 0; j < q.N; j++) for (let i = 0; i < q.N; i++) planned.add(idx(...turn(q.op, q.N, q.tx, q.ty)(i, j)));
        const open = (x, y) => free(x, y) && !planned.has(idx(x, y)) && !N4.some(([dx, dy]) => laid.has(idx(x + dx, y + dy)) && !trunkA.has(idx(x + dx, y + dy)));
        const w = walkPath(edge.filter(([x, y]) => open(x, y)), q.sides[0].a, open);
        if (w && w.length >= T.walk.min && w.length <= T.walk.max) {
          if (!v19) { b = q; path = w; continue; }
          const mark = saved.size; layWalk(q, w); // version 19: a greater tree whose walk lies under its branches, or whose wood walls ground off, is passed over for the next spot, not the whole grove
          if (!underBranch() && layouts < maxLayouts && (layouts++, reachable(map)[idx(...a.step)] && !cutsOff(laid))) { b = q; path = w; laidB = true; } else for (const i of [...saved.keys()].slice(mark)) { const tile = map.tiles[i]; for (const k2 of Object.keys(tile)) delete tile[k2]; Object.assign(tile, saved.get(i)); saved.delete(i); laid.delete(i); }
        }
      }
      if (!path) { undo(); continue; }
      if (!laidB) layWalk(b, path);
      trees.push(a, b);
      if (!v19 && underBranch()) { undo(); continue; }
    }
    const foot = trees[0].step;
    if (!laidB) { layouts++; if (!reachable(map)[idx(...foot)] || cutsOff(laid)) { undo(); continue; } } // the wood cuts the foot, or any ground, off: try elsewhere
    // Perches in the gaps: level with the branch below, two or three under the branch above, never on a hop.
    const hopGap = new Set(); for (const p of [...trees.flatMap((q) => q.hops), ...hops]) hopGap.add(idx((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2));
    let pads = 0;
    for (const tr of trees) {
      const trunk = new Set(); for (let j = 0; j < tr.N; j++) for (let i = 0; i < tr.N; i++) trunk.add(idx(...turn(tr.op, tr.N, tr.tx, tr.ty)(i, j)));
      const cand = [];
      for (const q of tr.climb) for (const [dx, dy] of N4) {
        const x = q.p[0] + dx, y = q.p[1] + dy; if (!free(x, y) || hopGap.has(idx(x, y))) continue;
        const ns = N4.map(([ex, ey]) => [x + ex, y + ey]).filter(([nx, ny]) => laid.has(idx(nx, ny)) && !trunk.has(idx(nx, ny))).map(([nx, ny]) => at(nx, ny));
        if (ns.length < 2 || ns.some((n) => n.kind === "canopyTrunk" || n.pad)) continue;
        const lo = Math.min(...ns.map((n) => n.elev)), hi = Math.max(...ns.map((n) => n.elev));
        if (lo >= 2 && hi - lo >= T.pads.fall[0] && hi - lo <= T.pads.fall[1] && ns.every((n) => n.elev === lo || n.elev - lo >= T.pads.fall[0])) cand.push([x, y, lo]);
      }
      const seen = new Set(), order = cand.filter(([x, y]) => !seen.has(idx(x, y)) && seen.add(idx(x, y))).sort((p, q) => (h(`pad:${p[0]}:${p[1]}`) % 997) - (h(`pad:${q[0]}:${q[1]}`) % 997));
      let n = 0;
      for (const [x, y, lo] of order) {
        if (n >= T.pads.max) break; if (N4.some(([dx, dy]) => at(x + dx, y + dy)?.pad)) continue;
        if (v18 && [1, 2].some((k) => y + k < 32 && laid.has(idx(x, y + k)) && (at(x, y + k).elev || 0) > lo)) continue; // version 18: never behind a higher branch one or two rows nearer the camera, whose drawn face would hide it
        if (v18 && [1, 2, 3, 4, 5, 6].some((k) => { if (y - k < 0 || !laid.has(idx(x, y - k))) return false; const q = at(x, y - k), off = k - (lo - (q.elev - (q.slope ? .5 : 0))) * TREES_V18.drawnLevel; return off > -1.26 && off < 1; })) continue; // nor where its own drawn face would hide a branch behind it
        const was = { ...at(x, y) }, fresh = !saved.has(idx(x, y)); put(x, y, { kind: "canopyLeaf", elev: lo, slope: false, look: tr.look, pad: true, leaves: 1 });
        if (!reachable(map)[idx(...foot)] || cutsOff(laid)) { const tile = at(x, y); for (const k of Object.keys(tile)) delete tile[k]; Object.assign(tile, was); laid.delete(idx(x, y)); if (fresh) saved.delete(idx(x, y)); continue; } // a perch never walls the foot off
        n++;
      }
      pads += n;
      const nb = pick(h(`boughs:${tr.tx}:${tr.ty}`), T.boughs.count); tr.boughs = [];
      for (let k = 0; k < nb; k++) { const r = h(`bough:${tr.tx}:${tr.ty}:${k}`); tr.boughs.push({ at: .12 + .8 * ((r % 1000) / 1000), side: (r >>> 10) % 2 ? 1 : -1, len: T.boughs.len[0] + (T.boughs.len[1] - T.boughs.len[0]) * (((r >>> 11) % 100) / 100), lift: ((r >>> 18) % 5) / 10, leaves: 2 + (r >>> 21) % 3 }); }
    }
    if (v20 && !readableTree(map, laid, trees)) { undo(); continue; } // version 20: so drawn (canopyRepaint), every climb tile shows but the one twin-covered tile a tree has
    const cleared = new Set(laid), strip = new Set();
    if (v18) { // version 18: the wood's trees also leave the hop gaps and the strip the trunk is drawn up, so nothing stands in front of it
      for (const tr of trees) {
        for (const sd of tr.sides) for (const [x, y] of sd.gap || []) cleared.add(idx(x, y));
        const P = TREES_V18.columnPad, rows = Math.ceil(tr.top * TREES_V18.drawnLevel) + P;
        for (let y = Math.max(0, tr.ty - rows); y < tr.ty + tr.N; y++) for (let x = Math.max(0, tr.tx - P); x <= Math.min(31, tr.tx + tr.N - 1 + P); x++) strip.add(idx(x, y));
      }
    }
    map.objects = (map.objects || []).filter((o) => { const i = idx(Math.round(o.x), Math.round(o.y)); return !((o.jungle || (v14 && o.forest)) && cleared.has(i)) && !(o.kind === "tree" && strip.has(i)); }); // 672: a forest's own trees too; version 18: any tree in the trunk's strip
    map.enemySpawns = (map.enemySpawns || []).filter((q) => !laid.has(idx(Math.round(q.x), Math.round(q.y))));
    const door = trees[trees.length - 1], gate = turn(door.op, door.N, door.tx, door.ty)(Math.floor(door.N / 2), Math.floor(door.N / 2));
    const dest = (hashSeed(`${seed}:canopy-door:v1:${ry * 7919 + rx}`) % 1000) / 1000 < T.starfield ? "starfield" : "cloud";
    map.objects.push({ id: `canopy-gate-${rx}-${ry}`, kind: "canopyGate", name: dest === "starfield" ? "A door in the great tree, full of stars" : "A door in the great tree, full of cloud", x: gate[0], y: gate[1], dest, actions: ["enter"], state: "open" });
    const xs = [...laid].map((i) => i % 32), ys = [...laid].map((i) => Math.floor(i / 32)), bx = Math.min(...xs) - 1, by = Math.min(...ys) - 1, n = Math.max(Math.max(...xs) - bx, Math.max(...ys) - by) + 2;
    const rec = (tr, low) => ({ x0: tr.tx, y0: tr.ty, size: tr.N, top: tr.top, look: tr.look, boughs: tr.boughs, ...(low ? { low: true } : {}) });
    map.canopy = { version: v20 ? TREES_V20.version : v19 ? TREES_V19.version : v18 ? TREES_V18.version : v14 ? TREES_V14.version : TREE_VERSION, ...(v14 ? { region } : {}), form, x0: door.tx, y0: door.ty, size: door.N, height: door.top, top: door.top, branches: door.sides.length * 2, reach: door.sides.map((q) => q.L), dest, pads, walk: walk.length, trees: trees.map((tr, i) => rec(tr, i < trees.length - 1)), box: { x: bx, y: by, n } };
    return map.canopy;
  }
  return null;
}
