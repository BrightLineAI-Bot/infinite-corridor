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
import { hashSeed } from "./random.js?v=r682-b73c5512a0b0";

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

// Plan one tree's climb: where its branches go and how long each side's are, or null when the ground will not take it.
function planTree(h, key, spec, ground, tx, ty) {
  const N = Array.isArray(spec.trunk) ? pick(h(`${key}:n`), spec.trunk) : spec.trunk, op = h(`${key}:op`) % 8, W = turn(op, N, tx, ty), D = turnDir(op);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!ground(...W(i, j))) return null;
  const count = spec.sides[h(`${key}:sides`) % spec.sides.length], sides = [];
  for (let k = 0; k < count; k++) {
    const sd = SIDES(N)[k], d = D(sd.d), a = W(...sd.a), b = W(...sd.b), knot = k < count - 1 ? W(...sd.knot) : null, want = pick(h(`${key}:r${k}`), spec.reach); let L = 0;
    for (let r = 0; r < want; r++) { if (![a, b].every(([x, y]) => ground(x + d[0] * r, y + d[1] * r))) break; L = r + 1; }
    if (L < spec.reach[0] || (knot && !ground(...knot))) return null;
    sides.push({ d, a, b, knot, L });
  }
  const step = W(SIDES(N)[0].a[0], -1); // the ground beside the first branch, where the climb starts
  const look = h(`${key}:look`) % TREES.looks.length;
  return { N, op, tx, ty, sides, step, look, tiles: [] };
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
export function growTrees(map, seed, rx, ry, { ground, reachable, trapped, version = 13, region = "jungle" }) {
  const T = TREES, h = (k) => hashSeed(`${seed}:trees:v13:${rx}:${ry}:${k}`), at = (x, y) => map.tiles[idx(x, y)], v14 = version >= TREES_V14.version;
  if (!v14 && (hashSeed(`${seed}:canopy-grow:v1:${ry * 7919 + rx}`) % 1000) / 1000 >= T.chance) return null;
  if (v14 && (hashSeed(`${seed}:canopy-grow:v2:${region}:${ry * 7919 + rx}`) % 1000) / 1000 >= (TREES_V14.regions[region]?.chance || 0)) return null;
  // Version 14: every spot, in a hashed order (the same each time); version 13: `tries` hashed spots.
  const spots = v14 ? Array.from({ length: 26 * 26 }, (_, i) => [2 + i % 26, 2 + Math.floor(i / 26)]).sort((p, q) => hashSeed(`${seed}:tree-spot:v14:${rx}:${ry}:${p}`) - hashSeed(`${seed}:tree-spot:v14:${rx}:${ry}:${q}`)) : null;
  let layouts = 0;
  const before = reachable(map), stuck = new Set(trapped(map).map((t) => idx(t.x, t.y))); // wood never walls ground off, nor makes a pit you can drop into and not climb out of
  const cutsOff = (laid) => { const r = reachable(map); for (let i = 0; i < 1024; i++) if (before[i] && !r[i] && !laid.has(i)) return true; return trapped(map).some((t) => !stuck.has(idx(t.x, t.y))); };
  const first = weighted(h("form"), T.forms), forms = [...(first === "grove" ? ["grove", "spire"] : ["spire"]), ...(v14 ? ["compact"] : [])];
  for (const form of forms) for (let t = 0; t < (v14 && form !== "grove" ? spots.length : T.tries[form]); t++) {
    if (v14 && layouts >= TREES_V14.layouts) break;
    const shape = form === "compact" ? "spire" : form, spec = form === "compact" ? TREES_V14.compact : T.spire;
    const saved = new Map(), laid = new Set(), keep = (x, y) => { if (!saved.has(idx(x, y))) saved.set(idx(x, y), { ...at(x, y) }); };
    const put = (x, y, props) => { keep(x, y); Object.assign(at(x, y), { blocked: false, canopy: true, skyPlatform: true, ...props }); laid.add(idx(x, y)); };
    const undo = () => { for (const [i, t0] of saved) { const tile = map.tiles[i]; for (const k of Object.keys(tile)) delete tile[k]; Object.assign(tile, t0); } };
    const free = (x, y) => ground(x, y) && !laid.has(idx(x, y));
    const layTree = (plan, start, key) => {
      const c = climbTiles(plan, start);
      for (const q of c.tiles) put(...q.p, { kind: "canopyBranch", elev: q.elev, slope: q.slope, look: plan.look, ...(q.tip ? { leaves: 2 } : h(`${key}:leaf:${q.p}`) % 1000 < T.leaves.branch * 1000 ? { leaves: 1 } : {}) });
      for (let j = 0; j < plan.N; j++) for (let i = 0; i < plan.N; i++) { const [x, y] = turn(plan.op, plan.N, plan.tx, plan.ty)(i, j); put(x, y, { kind: "canopyTrunk", elev: c.top, slope: false, look: plan.look }); }
      plan.top = c.top; plan.hops = c.hops; plan.climb = c.tiles; return c;
    };
    const [tx, ty] = v14 && form !== "grove" ? spots[t] : [2 + h(`${form}:x${t}`) % 26, 2 + h(`${form}:y${t}`) % 26];
    const fits = (plan) => plan && plan.sides.every((sd) => [sd.a, sd.b].every(([x, y]) => { for (let r = 0; r < sd.L; r++) if (!free(x + sd.d[0] * r, y + sd.d[1] * r)) return false; return true; }) && (!sd.knot || free(...sd.knot)));
    const trees = [], walk = [], hops = [];
    if (shape === "spire") {
      const p = planTree(h, `${form}:${t}`, spec, ground, tx, ty); if (!p || !free(...p.step)) continue;
      layTree(p, 1, `${form}:${t}`); trees.push(p);
    } else {
      const a = planTree(h, `lesser:${t}`, T.lesser, ground, tx, ty); if (!a || !free(...a.step)) continue;
      layTree(a, 1, `lesser:${t}`);
      // The greater tree: the first of a few dozen hashed spots its climb fits at, with a canopy walk to it from the lesser crown.
      const edge = []; for (let j = -1; j <= a.N; j++) for (let i = -1; i <= a.N; i++) if ((i < 0 || j < 0 || i >= a.N || j >= a.N) && !((i < 0 || i >= a.N) && (j < 0 || j >= a.N))) edge.push(turn(a.op, a.N, a.tx, a.ty)(i, j));
      const trunkA = new Set(); for (let j = 0; j < a.N; j++) for (let i = 0; i < a.N; i++) trunkA.add(idx(...turn(a.op, a.N, a.tx, a.ty)(i, j)));
      let b = null, path = null;
      for (let k = 0; k < T.greaterTries && !path; k++) {
        const q = planTree(h, `greater:${t}:${k}`, T.greater, free, 2 + h(`greater:x${t}:${k}`) % 26, 2 + h(`greater:y${t}:${k}`) % 26); if (!fits(q)) continue;
        const planned = new Set(), c = climbTiles(q, 1); for (const r of c.tiles) planned.add(idx(...r.p)); for (const [p, q2] of c.hops) planned.add(idx((p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2)); for (let j = 0; j < q.N; j++) for (let i = 0; i < q.N; i++) planned.add(idx(...turn(q.op, q.N, q.tx, q.ty)(i, j)));
        const open = (x, y) => free(x, y) && !planned.has(idx(x, y)) && !N4.some(([dx, dy]) => laid.has(idx(x + dx, y + dy)) && !trunkA.has(idx(x + dx, y + dy)));
        const w = walkPath(edge.filter(([x, y]) => open(x, y)), q.sides[0].a, open);
        if (w && w.length >= T.walk.min && w.length <= T.walk.max) { b = q; path = w; }
      }
      if (!path) { undo(); continue; }
      // The canopy walk: leaf platforms level with the lesser crown, a gap (hopped one level up) every few platforms.
      let e = a.top, since = 0;
      for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i], p0 = path[i - 1], p1 = path[i + 1], straight = p0 && p1 && p1[0] - x === x - p0[0] && p1[1] - y === y - p0[1];
        if (straight && since >= T.walk.gapEvery && i >= 2 && i < path.length - 2) { hops.push([p0, p1]); e++; since = 0; continue; }
        put(x, y, { kind: "canopyLeaf", elev: e, slope: false, look: a.look, walk: true }); walk.push([x, y]); since++;
      }
      layTree(b, e + 1, `greater:${t}`); trees.push(a, b);
    }
    const foot = trees[0].step; layouts++;
    if (!reachable(map)[idx(...foot)] || cutsOff(laid)) { undo(); continue; } // the wood cuts the foot, or any ground, off: try elsewhere
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
        const was = { ...at(x, y) }, fresh = !saved.has(idx(x, y)); put(x, y, { kind: "canopyLeaf", elev: lo, slope: false, look: tr.look, pad: true, leaves: 1 });
        if (!reachable(map)[idx(...foot)] || cutsOff(laid)) { const tile = at(x, y); for (const k of Object.keys(tile)) delete tile[k]; Object.assign(tile, was); laid.delete(idx(x, y)); if (fresh) saved.delete(idx(x, y)); continue; } // a perch never walls the foot off
        n++;
      }
      pads += n;
      const nb = pick(h(`boughs:${tr.tx}:${tr.ty}`), T.boughs.count); tr.boughs = [];
      for (let k = 0; k < nb; k++) { const r = h(`bough:${tr.tx}:${tr.ty}:${k}`); tr.boughs.push({ at: .12 + .8 * ((r % 1000) / 1000), side: (r >>> 10) % 2 ? 1 : -1, len: T.boughs.len[0] + (T.boughs.len[1] - T.boughs.len[0]) * (((r >>> 11) % 100) / 100), lift: ((r >>> 18) % 5) / 10, leaves: 2 + (r >>> 21) % 3 }); }
    }
    map.objects = (map.objects || []).filter((o) => !((o.jungle || (v14 && o.forest)) && laid.has(idx(Math.round(o.x), Math.round(o.y))))); // 672: a forest's own trees too
    map.enemySpawns = (map.enemySpawns || []).filter((q) => !laid.has(idx(Math.round(q.x), Math.round(q.y))));
    const door = trees[trees.length - 1], gate = turn(door.op, door.N, door.tx, door.ty)(Math.floor(door.N / 2), Math.floor(door.N / 2));
    const dest = (hashSeed(`${seed}:canopy-door:v1:${ry * 7919 + rx}`) % 1000) / 1000 < T.starfield ? "starfield" : "cloud";
    map.objects.push({ id: `canopy-gate-${rx}-${ry}`, kind: "canopyGate", name: dest === "starfield" ? "A door in the great tree, full of stars" : "A door in the great tree, full of cloud", x: gate[0], y: gate[1], dest, actions: ["enter"], state: "open" });
    const xs = [...laid].map((i) => i % 32), ys = [...laid].map((i) => Math.floor(i / 32)), bx = Math.min(...xs) - 1, by = Math.min(...ys) - 1, n = Math.max(Math.max(...xs) - bx, Math.max(...ys) - by) + 2;
    const rec = (tr, low) => ({ x0: tr.tx, y0: tr.ty, size: tr.N, top: tr.top, look: tr.look, boughs: tr.boughs, ...(low ? { low: true } : {}) });
    map.canopy = { version: v14 ? TREES_V14.version : TREE_VERSION, ...(v14 ? { region } : {}), form, x0: door.tx, y0: door.ty, size: door.N, height: door.top, top: door.top, branches: door.sides.length * 2, reach: door.sides.map((q) => q.L), dest, pads, walk: walk.length, trees: trees.map((tr, i) => rec(tr, i < trees.length - 1)), box: { x: bx, y: by, n } };
    return map.canopy;
  }
  return null;
}
