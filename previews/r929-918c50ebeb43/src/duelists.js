// The Gaunt (Tim, 2026-11-12): "some enemies that use one of those RPG character models (not the Wayfarer)... thinner, incredibly
// fit, almost skeletal... big heads and chunky hands... arms, legs and torso incredibly thin, like a stick figure... they hop around
// and jump around, more active, smarter AI so they come closer and attack... use blades, some swords, some daggers, some a
// polearm... aggressive but pretty smart... they can jump... more health than normal enemies... hoods over their faces".
//
// Three hooded duelists, one family: the Gaunt Duelist (a sword: a mid-range three-cut combo), the Gaunt Cutthroat (two daggers:
// it darts in, cuts twice and darts out) and the Gaunt Longarm (a polearm: a long thrust and a wide sweep, from the end of its reach).
// They are Monster Pack creatures (monster-pack.ts, `duelistKin`), `prototypeOnly`, so no existing roster, guardian pool, Echo list or
// hybrid roll ever draws them: only the placement here (Game.placeDuelists, on ground first entered from `DUELISTS.version`) and the
// Proving Ground's combat lab put them in the world.
//
// Every number they use is in DUELISTS. Nothing here touches the save, the DOM or randomness: every choice is hashed from stable ids.
import { hashSeed } from "./random.js?v=r929-918c50ebeb43";

export const DUELIST_KINDS = Object.freeze(["gauntDuelist", "gauntCutthroat", "gauntLongarm"]);
const TAU = Math.PI * 2;

export const DUELISTS = Object.freeze({
  version: 1, // the placement version a dungeon history pins (pinDungeonLayout: `duelistVersion`, 0 for a crossing entered before)
  // Health: `reference` is the ordinary medium pack creature (the median of the medium, non-unique roster: Crystal Crab 30, Veil
  // Spinner 32, Rift Lynx 36, Mirror Shade 38, Lumen Wraith 42), times each kind's factor (Tim: "more health than normal enemies";
  // the task: 1.6 to 2 times). Damage stays inside the ordinary roster's 8 to 14.
  reference: Object.freeze({ hp: 36, damage: 9 }),
  health: Object.freeze({ gauntDuelist: 1.8, gauntCutthroat: 1.65, gauntLongarm: 1.95 }),
  damage: Object.freeze({ gauntDuelist: 9, gauntCutthroat: 8, gauntLongarm: 10 }),
  // Standard-view size: a little taller than the Wayfarer (Close View: close-view-beast-duelist.ts DUELIST_RIG).
  scale: 1.08,
  // How each kind fights between attacks. `preferred`: the distance band it circles in (tiles); `approach`/`strafe`/`retreat`: its pace
  // closing in, circling and backing off (of its walking pace); `flip`: seconds between changes of circling direction (hashed in the
  // range); `backOff`: nearer than this, it gives ground (the Longarm keeps its reach).
  ai: Object.freeze({
    gauntDuelist: Object.freeze({ preferred: Object.freeze([1.5, 2.4]), approach: 1.15, strafe: .72, retreat: .9, flip: Object.freeze([1.6, 3]), backOff: .9 }),
    gauntCutthroat: Object.freeze({ preferred: Object.freeze([2.2, 3.2]), approach: 1.25, strafe: .85, retreat: 1, flip: Object.freeze([1.1, 2.2]), backOff: 1.4 }),
    gauntLongarm: Object.freeze({ preferred: Object.freeze([2.4, 3.4]), approach: 1, strafe: .72, retreat: 1.05, flip: Object.freeze([2, 3.6]), backOff: 1.9 }),
  }),
  // Never on top of one another: within `radius` tiles of another living foe each pushes the other away (`weight` of a full step).
  separation: Object.freeze({ radius: 1.2, weight: 1.5 }),
  // The hop: a short leap to open ground `reach` tiles away (up or down at most `maxRise`/`maxDrop` levels: the elevation rules a
  // Wayfarer's jump has, never a fall), `time` seconds in the air, `arc` tiles of lift at the top (+ `climb` a level climbed). It hops
  // to close in (the Wayfarer on another level, or out of reach on foot), now and then (every `every` seconds, `chance`
  // percent: in toward the Wayfarer when it stands `closeFrom` past the band, else to a new angle round them), and back or aside after an attack (`after`). Searches sample `dirs` directions on each radius: at most a few dozen
  // floor tests, and not again for `cooldown` seconds.
  hop: Object.freeze({ reach: Object.freeze([1.4, 2.1, 2.7]), dirs: 12, time: .42, arc: .9, climb: .45, maxRise: 1, maxDrop: 1, cooldown: 1.6, every: 2.2, chance: 40, closeFrom: 1.2, samples: 6 }),
  // After an attack: `back` (a hop away), `side` (a hop aside) or `stay`, by hashed share (percent); the Longarm hops back only when
  // the Wayfarer stands within `near` of it.
  after: Object.freeze({
    gauntDuelist: Object.freeze({ back: 35, side: 45 }),
    gauntCutthroat: Object.freeze({ back: 100, side: 0 }), // in and out: it always darts back out
    gauntLongarm: Object.freeze({ back: 70, side: 20, near: 2.2 }),
  }),
  // The feint: `chance` percent of attacks hold the swing `delay` seconds longer, the telegraph shown the whole time.
  feint: Object.freeze({ chance: 30, delay: .38 }),
  // The attacks (monster-pack ATTACK_MODULES reads these). Seconds, tiles and multipliers of the creature's damage. Every windup is at
  // least .4 s. `cuts`: when each cut lands, seconds into the active phase; `arc` degrees and `radius` past the body; `step`: how far it
  // presses forward with each cut; `dash`: the Cutthroat's dart in (tiles, and how near the target it stops).
  attacks: Object.freeze({
    duelCombo: Object.freeze({ name: "Gaunt Combo", range: Object.freeze([0, 2.4]), cooldown: 2.4, windup: .55, active: .66, recover: .55, damage: .5,
      cuts: Object.freeze([.06, .3, .56]), arc: 120, radius: 1.6, step: .22, text: "Three quick cuts from a long sword, each a step closer. Each cut sweeps the arc in front of it." }),
    duelTwinCuts: Object.freeze({ name: "Twin Cuts", range: Object.freeze([0, 3.8]), cooldown: 2.1, windup: .46, active: .5, recover: .45, damage: .6,
      cuts: Object.freeze([.3, .42]), arc: 110, radius: 1.15, dash: Object.freeze({ time: .26, length: 2.4, stop: .95 }), text: "Darts in with both knives and cuts twice, then darts back out." }),
    duelThrust: Object.freeze({ name: "Long Thrust", range: Object.freeze([1, 3.2]), cooldown: 2.2, windup: .6, active: .12, recover: .7, damage: 1.1,
      length: 3.5, width: .42, text: "A long thrust of the polearm down a narrow line. It reaches farther than it looks." }),
    duelSweep: Object.freeze({ name: "Wide Sweep", range: Object.freeze([0, 2.9]), cooldown: 3.6, windup: .72, active: .2, recover: .8, damage: .85,
      arc: 220, radius: 2.3, jumpable: true, text: "A low, wide sweep of the polearm round its front. Step back out of it, or jump it." }),
  }),
  kits: Object.freeze({ gauntDuelist: Object.freeze(["duelCombo"]), gauntCutthroat: Object.freeze(["duelTwinCuts"]), gauntLongarm: Object.freeze(["duelThrust", "duelSweep"]) }),
  // Where they live: ordinary crossings from aperture tier `minTier` (the ladder tier the crossing was first made at), the Old Keeps'
  // floors and the Pentagons' chambers; each place rolls `chance` (per floor) for a band of `count` (hashed). Never more than
  // `maxPerArea` on one floor; never within `clearEntry` tiles of a way in; each on its own tile at least `spacing` from the others,
  // within `cluster` of the first; only on floor reachable from the way in, with `minMoves` of its four neighbours open on its level.
  spawn: Object.freeze({
    places: Object.freeze({
      crossing: Object.freeze({ minTier: 3, chance: .4, count: Object.freeze([1, 2]) }),
      keepHall: Object.freeze({ chance: .45, count: Object.freeze([1, 2]) }),
      pentagon: Object.freeze({ chance: .35, count: Object.freeze([1, 3]) }),
    }),
    weights: Object.freeze({ gauntDuelist: 4, gauntCutthroat: 3, gauntLongarm: 3 }),
    maxPerArea: 3, clearEntry: 4, spacing: 1.5, cluster: 5, minMoves: 3, searchCap: 4096,
  }),
});

// ---------------------------------------------------------------- stats
export const isDuelistKind = (kind) => DUELIST_KINDS.includes(kind);
// [hp, damage, range]: the shape every pack creature's stats take.
export function duelistStats(kind) { return [Math.round(DUELISTS.reference.hp * DUELISTS.health[kind]), DUELISTS.damage[kind], 0]; }

// ---------------------------------------------------------------- placement (pure)
// Whether a floor gets a band, and of what. `place` one of DUELISTS.spawn.places; `tier` the crossing's ladder tier (crossings only).
export function duelistPlan(seed, areaKey, place, tier = 0) {
  const P = DUELISTS.spawn.places[place]; if (!P) return null;
  if (P.minTier != null && !(Number(tier) >= P.minTier)) return null;
  const h = (k) => hashSeed(`${seed}:duelists:v${DUELISTS.version}:${areaKey}:${k}`);
  if ((h("roll") % 1000) / 1000 >= P.chance) return null;
  const count = Math.min(DUELISTS.spawn.maxPerArea, P.count[0] + h("n") % (P.count[1] - P.count[0] + 1));
  const W = DUELISTS.spawn.weights, total = DUELIST_KINDS.reduce((n, k) => n + W[k], 0), kinds = [];
  for (let i = 0; i < count; i++) { let r = h(`kind${i}`) % total; for (const k of DUELIST_KINDS) { if (r < W[k]) { kinds.push(k); break; } r -= W[k]; } }
  return { place, count, kinds };
}
// The band's spawns on `map` (tiles `width` wide). `open(x, y)`: a creature's footprint fits there and it is not lethal ground;
// `level(x, y)`: the floor's level; `arrivals`: the ways in (the reachable floor is searched from them, by the Wayfarer's rules:
// a step on the level or a slope, a jump up one, a drop of any height). `where(tile)` narrows the floor (optional).
export function duelistSpawns(map, width, seed, areaKey, plan, { open, level = () => 0, arrivals = [], where = null } = {}) {
  if (!plan?.count || !map?.tiles?.length || typeof open !== "function") return [];
  const S = DUELISTS.spawn, height = Math.floor(map.tiles.length / width), h = (k) => hashSeed(`${seed}:duelists-at:v${DUELISTS.version}:${areaKey}:${k}`);
  if (width * height > S.searchCap * 4) return [];
  const starts = arrivals.filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map((p) => [Math.round(p.x), Math.round(p.y)]).filter(([x, y]) => x >= 0 && y >= 0 && x < width && y < height);
  if (!starts.length) return [];
  // reachable floor: a breadth-first search from the ways in
  const seen = new Uint8Array(width * height), q = [];
  for (const [x, y] of starts) { const i = y * width + x; if (!seen[i] && open(x, y)) { seen[i] = 1; q.push(i); } }
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % width, y = (i - x) / width, here = level(x, y);
    for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[j] || !open(nx, ny)) continue;
      const t0 = map.tiles[i], t1 = map.tiles[j], step = level(nx, ny) - here; if (step > 1 && !(t0?.slope || t1?.slope)) continue; seen[j] = 1; q.push(j); }
  }
  const objAt = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), taken = new Set((map.enemySpawns || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const far = (x, y) => starts.every(([ax, ay]) => Math.hypot(x - ax, y - ay) >= S.clearEntry);
  const moves = (x, y) => { const lv = level(x, y); let n = 0; for (const [dx, dy] of N4) if (open(x + dx, y + dy) && level(x + dx, y + dy) === lv) n++; return n; };
  const cand = [];
  for (let i = 0; i < seen.length; i++) {
    if (!seen[i]) continue; const x = i % width, y = (i - x) / width, t = map.tiles[i];
    if (!t || t.blocked || t.door || t.doorway || t.hole || t.pit || t.stair || t.stairs || t.slope || t.chasm || x < 1 || y < 1 || x > width - 2 || y > height - 2) continue;
    if (objAt.has(`${x},${y}`) || taken.has(`${x},${y}`) || !far(x, y) || (where && !where(t)) || moves(x, y) < S.minMoves) continue;
    cand.push([x, y]);
  }
  if (!cand.length) return [];
  const [ax, ay] = cand[h("anchor") % cand.length], near = cand.filter(([x, y]) => Math.hypot(x - ax, y - ay) <= S.cluster), pool = near.length >= plan.count ? near : cand, out = [];
  for (let i = 0; out.length < plan.count && i < plan.count * 10; i++) {
    const [x, y] = i === 0 ? [ax, ay] : pool[h(`p${i}`) % pool.length];
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < S.spacing)) continue;
    out.push({ id: `duelist:${areaKey}:${out.length}`, kind: plan.kinds[out.length] || DUELIST_KINDS[0], x, y, duelist: true, traits: [] });
  }
  return out;
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---------------------------------------------------------------- the fight (pure helpers the pack runners use; `w` is the pack world)
const levelOf = (w, x, y) => Number(w?.elevation?.(x, y)) || 0;
// Push away from every other living foe within DUELISTS.separation.radius; returns the push (tiles of a full step) or zero.
export function duelSeparation(e, enemies, out = { x: 0, y: 0 }) {
  const R = DUELISTS.separation.radius; out.x = 0; out.y = 0;
  for (const q of enemies || []) {
    if (q === e || q.dead || q.ambient || q.passiveBehavior || q.untargetable && q.hidden) continue;
    const dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy); if (d >= R) continue;
    const k = (R - d) / R * DUELISTS.separation.weight;
    if (d < 1e-4) { const a = (hashSeed(`${e.id}:apart`) % 628) / 100; out.x += Math.cos(a) * k; out.y += Math.sin(a) * k; } else { out.x += dx / d * k; out.y += dy / d * k; }
  }
  return out;
}
// Whether a hop from `a` to `b` is allowed: open ground at the landing, at most one level up or down, and nothing between higher than
// the higher end (it hops over a low step, never through a wall or a tall block). Sampled at DUELISTS.hop.samples points.
export function hopClear(w, a, b) {
  const H = DUELISTS.hop, la = levelOf(w, a.x, a.y), lb = levelOf(w, b.x, b.y);
  if (!w.open(b.x, b.y) || lb - la > H.maxRise || la - lb > H.maxDrop) return false;
  const top = Math.max(la, lb);
  for (let i = 1; i < H.samples; i++) { const k = i / H.samples, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k; if (!w.open(x, y) || levelOf(w, x, y) > top) return false; }
  return true;
}
// Where to hop. `mode`: "close" (toward the Wayfarer, onto their level if it can), "back" (away from them), "side" (aside, keeping
// the distance), "circle" (anywhere in the band round them). Returns the best landing or null; at most reach.length x dirs tests.
export function findHop(e, w, p, mode, seq = 0, band = [1.5, 2.5]) {
  const H = DUELISTS.hop, base = Math.atan2(p.y - e.y, p.x - e.x), want = levelOf(w, p.x, p.y), here = levelOf(w, e.x, e.y), d0 = Math.hypot(p.x - e.x, p.y - e.y), off = (hashSeed(`${e.id}:hop:${seq}`) % 1000) / 1000;
  let best = null, bestScore = -Infinity;
  for (const r of H.reach) for (let i = 0; i < H.dirs; i++) {
    const a = base + (i + off * .5) * TAU / H.dirs, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r, to = { x, y };
    const dp = Math.hypot(p.x - x, p.y - y); if (dp < .9) continue; // never onto the Wayfarer
    const lv = levelOf(w, x, y); let score;
    if (mode === "close") score = -Math.abs(dp - (band[0] + band[1]) / 2) - Math.abs(lv - want) * 2.5 + (lv === want && here !== want ? 3 : 0);
    else if (mode === "back") score = dp - d0 - Math.abs(lv - here) * .5 - (dp > band[1] + 2 ? dp - band[1] - 2 : 0);
    else if (mode === "side") score = -Math.abs(dp - d0) * 1.5 + Math.abs(Math.sin(a - base)) * 2 - Math.abs(lv - here) * .5;
    else score = -Math.abs(dp - (band[0] + band[1]) / 2) + Math.abs(Math.sin(a - base)) - Math.abs(lv - want);
    if (score <= bestScore || !hopClear(w, e, to)) continue;
    best = to; bestScore = score;
  }
  return best;
}
// The lift of a hop `k` (0..1) through it, climbing `climb` levels.
export const hopArc = (k, climb = 0) => Math.sin(Math.max(0, Math.min(1, k)) * Math.PI) * (DUELISTS.hop.arc + Math.max(0, climb) * DUELISTS.hop.climb);
