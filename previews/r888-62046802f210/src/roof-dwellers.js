// The Pentagon roofs' dwellers. Tim, 2026-11-04: "The roof is just another path. There could be gargoyles and angels and demons up
// there... just on top of the roof, for fun. Some bird creatures up there too... you won't see them, and they won't aggro to you,
// unless you're on the roof. Then they become visible and attack you." Then (roster revised): no new angel (the existing Cinder
// Seraph serves), and "a big stone lumbering creature... pounds you if you're close... its main attack is a laser from its chest",
// one or two per Pentagon roof.
//
// - Who (`kinds`, `colossus`): Eave Gargoyles, Ridge Demons, flocks of Slate Rooks, now and then a Cinder Seraph, and one or two
//   Battlement Colossi per Pentagon (monster-pack.ts). Their kits and vitals are pack data; regional threat scales them (Game).
// - Where (`roofPlan`, `roofSpawns`): hashed from the Pentagon's id (`map.pentagon.base`), never from play: which of its nine
//   sections hold which perches, and on which roof tiles (the roof interface below). A few perches a section, `cap.section` at most.
// - When (`roofTick`): while the Wayfarer is off the roof they are not in the game's enemy list at all: not drawn, not targetable,
//   not hostile, not hit by anything, not counted, no AI. Stepping onto the roof wakes those within `wake.radius` (a short wake-up,
//   `wake.seconds`, staggered), and they attack. Stepping off: fliers pursue for `pursue.seconds`, then fly home to their perches
//   and sleep again; ground dwellers stay up there (they sleep again at once, where they stood guard). A slain one stays slain
//   (Game records `roofSlain` on the Pentagon's history). No save change beyond that history key.
//
// The roof interface. The roof itself is the world-builder's (src/pentagon.ts, a later Pentagon version). This module asks only
// two questions, through `ROOF` (wired with `useRoof` when the Pentagon's helpers land):
//   roofAt(map, x, y)  -> is the tile (x, y) of this overworld section the Pentagon's roof (walkable roof the Wayfarer can stand on)?
//   roofSpots(map)     -> the roof tiles of this section, [{ x, y }], in a stable order.
// Until wired, a tile flagged `pentRoof` counts as roof (no tile has that flag today, so nothing spawns).
import { hashSeed } from "./random.js?v=r888-62046802f210";
import { LETHAL_KINDS } from "./landscape.js?v=r888-62046802f210";
import { MONSTER_PACK, MOVEMENT_MODES, ATTACK_MODULES } from "./monster-pack.js?v=r888-62046802f210";

export const ROOF_DWELLERS = {
  version: 1, // the plan's hash namespace; a new plan takes a new version (Pentagons already walked keep theirs)
  // Perch groups: a kind, its share (`weight`), and how many sit together (`flock`).
  kinds: [
    { kind: "roofGargoyle", weight: 4, flock: [1, 1] },
    { kind: "ridgeDemon", weight: 2, flock: [1, 1] },
    { kind: "slateRook", weight: 3, flock: [2, 3] },
    { kind: "cinderSeraph", weight: 1, flock: [1, 1] }, // the existing angel of the pack
  ],
  colossus: { kind: "roofColossus", count: [1, 2] }, // per Pentagon, each in its own section
  perSection: [1, 3], // perch groups in each of the Pentagon's nine sections (where its roof has room)
  cap: { section: 6 }, // creatures in one section at most, flocks and a colossus included
  perch: { edge: 2, apart: 3, room: 3, roomHuge: 8, flockReach: 2 }, // tiles from the section edge; between perches; roof tiles round a perch (of 8); a flock's spread
  wake: { seconds: 1.1, stagger: .18, radius: 16 }, // the wake-up; between each one's; how far from the Wayfarer they wake
  pursue: { seconds: 4 }, // fliers keep after the Wayfarer this long once off the roof
  home: { speed: 3.4, near: .35, seconds: 6 }, // then fly home at this speed (tiles a second); asleep when this near, or after `seconds`
  // Tuned against Tim's build (2026-11-04), then extrapolated. Regional threat first (Game.scaleToRegion, the one helper): that is
  // what a dweller deals and takes where the Wayfarer is no stronger than the region. Where the Wayfarer has outgrown the region the
  // dweller rises to meet them: health at least `hits` of the Wayfarer's blows (world-beasts.ts liveBeastReference perHit), and a ×1
  // attack at least `share` of the Wayfarer's maximum health after their damage reduction. An attack deals that times its module's
  // multiplier, so the Colossus's Heart Lamp (×6) takes 60% of a strong Wayfarer's health (two hits kill), its slam (×1.5) 15%.
  // Whatever the region, no single attack takes more than `cap` of the Wayfarer's health after reduction: nothing up there one-shots.
  tune: {
    hits: { roofGargoyle: 4, ridgeDemon: 6, slateRook: 1.5, cinderSeraph: 6, roofColossus: 14 },
    share: { roofGargoyle: .05, ridgeDemon: .065, slateRook: .02, cinderSeraph: .055, roofColossus: .1 },
    cap: .85,
    floor: 1,
  },
  // The Codex (main.ts): each roof kind's lore, its abilities, then this. Pentagons are uncertain things (narrative-bible.md, section 1).
  codex: "Seen only on the roofs of the Pentagons, and only by those who stand there. From below, the roofs are empty.",
  text: { wake: "Up on the roof, the stone moves.", sleep: "Behind you, on the roof, everything is still again." },
};

// The kinds that live only up there (the Cinder Seraph lives elsewhere too and keeps its own Codex entry).
export const ROOF_KINDS = Object.keys(MONSTER_PACK).filter((id) => MONSTER_PACK[id].roofKin);

// ---------------------------------------------------------------- the roof interface
export const ROOF = { at: null, spots: null };
export function useRoof({ roofAt = null, roofSpots = null } = {}) { ROOF.at = typeof roofAt === "function" ? roofAt : null; ROOF.spots = typeof roofSpots === "function" ? roofSpots : null; }
const W32 = 32;
const tileOf = (map, x, y) => (x >= 0 && y >= 0 && x < W32 && y < W32 ? map?.tiles?.[y * W32 + x] : null);
export function roofAt(map, x, y) { const tx = Math.floor(x), ty = Math.floor(y); return ROOF.at ? !!ROOF.at(map, tx, ty) : !!tileOf(map, tx, ty)?.pentRoof; }
export function roofSpots(map) {
  if (ROOF.spots) return (ROOF.spots(map) || []).filter((q) => Number.isFinite(q?.x) && Number.isFinite(q?.y)).map((q) => ({ x: Math.floor(q.x), y: Math.floor(q.y) }));
  const out = []; for (const t of map?.tiles || []) if (t?.pentRoof) out.push({ x: t.x, y: t.y }); return out;
}
// The tile under the Wayfarer's feet (as the roof hatch and the roof drawing read it).
export const footTile = (p) => ({ x: Math.floor(p.x + .5), y: Math.floor(p.y + .75) });
export const onRoof = (map, p) => { const f = footTile(p); return roofAt(map, f.x, f.y); };
export const isRoofFlier = (e) => !!MOVEMENT_MODES[e?.movement]?.flying;

// ---------------------------------------------------------------- the plan (pure, from the Pentagon's id)
const h = (base, k) => hashSeed(`${base}:roof:v${ROOF_DWELLERS.version}:${k}`);
const SECTIONS = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => `${dx},${dy}`));
function pickKind(base, k) {
  const K = ROOF_DWELLERS.kinds, total = K.reduce((n, q) => n + q.weight, 0); let r = h(base, k) % total;
  for (const q of K) { if (r < q.weight) return q; r -= q.weight; } return K[0];
}
// { "dx,dy": [{ kind, n }] } for the nine sections (offsets from the Pentagon's centre section).
export function roofPlan(base) {
  const D = ROOF_DWELLERS, out = {}, C = D.colossus;
  const nC = C.count[0] + h(base, "colossi") % (C.count[1] - C.count[0] + 1), order = [...SECTIONS].sort((a, b) => h(base, `cs:${a}`) - h(base, `cs:${b}`) || (a < b ? -1 : 1)), big = new Set(order.slice(0, nC));
  for (const key of SECTIONS) {
    const groups = [], n = D.perSection[0] + h(base, `n:${key}`) % (D.perSection[1] - D.perSection[0] + 1); let count = 0;
    if (big.has(key)) { groups.push({ kind: C.kind, n: 1 }); count++; }
    for (let g = 0; g < n; g++) { const q = pickKind(base, `k:${key}:${g}`), f = q.flock[0] + h(base, `f:${key}:${g}`) % (q.flock[1] - q.flock[0] + 1), m = Math.min(f, D.cap.section - count); if (m <= 0) break; groups.push({ kind: q.kind, n: m }); count += m; }
    out[key] = groups;
  }
  return out;
}
export const roofPlanCount = (plan) => Object.values(plan).reduce((n, g) => n + g.reduce((a, q) => a + q.n, 0), 0);

// The spawns for the section (rx, ry) of the Pentagon `pent` ({ cx, cy, base }): on open, safe roof tiles with room to move, clear of
// the section's edges, doorways, stairs, chests and every object, a perch `perch.apart` from the next. `slain`: ids that stay dead.
export function roofSpawns(map, pent, rx, ry, slain = []) {
  if (!map?.tiles?.length || !pent?.base) return [];
  const D = ROOF_DWELLERS, P = D.perch, base = pent.base, key = `${rx - pent.cx},${ry - pent.cy}`, groups = roofPlan(base)[key] || [];
  if (!groups.length) return [];
  const objAt = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), dead = new Set(slain || []);
  const safe = (x, y) => { const t = tileOf(map, x, y); return !!t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.pit && !t.hole && !t.doorway && !t.stairs && !objAt.has(`${x},${y}`) && x >= P.edge && y >= P.edge && x < W32 - P.edge && y < W32 - P.edge; };
  const room = (x, y) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && roofAt(map, x + dx, y + dy) && !tileOf(map, x + dx, y + dy)?.blocked) n++; return n; };
  const seen = new Set(), spots = []; for (const q of roofSpots(map)) { const k = `${q.x},${q.y}`; if (seen.has(k) || !roofAt(map, q.x, q.y) || !safe(q.x, q.y)) continue; seen.add(k); spots.push({ x: q.x, y: q.y, room: room(q.x, q.y) }); }
  const used = new Set(), perches = [], out = [];
  groups.forEach((g, gi) => {
    const huge = MONSTER_PACK[g.kind]?.sizeClass === "huge", need = huge ? P.roomHuge : P.room;
    const ok = spots.filter((q) => q.room >= need && !used.has(`${q.x},${q.y}`)), apart = ok.filter((q) => perches.every((r) => Math.hypot(q.x - r.x, q.y - r.y) >= P.apart)), pool = apart.length ? apart : ok;
    if (!pool.length) return;
    const at = pool[h(base, `at:${key}:${gi}`) % pool.length]; perches.push(at);
    const flock = [at, ...spots.filter((q) => q !== at && !used.has(`${q.x},${q.y}`) && q.room >= P.room && Math.max(Math.abs(q.x - at.x), Math.abs(q.y - at.y)) <= P.flockReach).sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y) || a.y - b.y || a.x - b.x)].slice(0, g.n);
    flock.forEach((q, i) => { used.add(`${q.x},${q.y}`); const id = `roof:${base}:${key}:${gi}:${i}`; if (!dead.has(id)) out.push({ id, kind: g.kind, x: q.x, y: q.y, traits: [], roofDweller: true, roofBase: base, roofHome: { x: q.x, y: q.y } }); });
  });
  return out.slice(0, D.cap.section);
}

// Tunes a regionally scaled dweller `c` to the Wayfarer `ref` ({ perHit, maxHp, guard }: liveBeastReference). Damage enters the
// game's hurt path raw, so it is set before reduction: share × max HP / (1 − guard).
const strongest = (c) => Math.max(1, ...[...(c.packAttacks || MONSTER_PACK[c.kind]?.attacks || [])].map((id) => Number(ATTACK_MODULES[id]?.damage) || 0));
export function tuneDweller(c, ref) {
  const T = ROOF_DWELLERS.tune, hits = T.hits[c?.kind], share = T.share[c?.kind]; if (!c || !ref || hits == null) return c;
  const guard = Math.max(0, Math.min(.75, Number(ref.guard) || 0)), life = Math.max(1, Number(ref.maxHp) || 60) / (1 - guard), hp = Math.max(Number(c.maxHp) || 1, Math.round((Number(ref.perHit) || 1) * hits));
  const damage = Math.min(Math.max(Number(c.damage) || 0, share * life), T.cap * life / strongest(c));
  c.maxHp = c.hp = hp; c.damage = Math.max(T.floor, Math.floor(damage)); if (c.baseDamage) c.baseDamage = c.damage; c.roofTuned = true;
  return c;
}

// ---------------------------------------------------------------- the runtime (Game supplies the host)
// host: { map, player, enemies, roof: { sleepers: [] } }. Returns { woke: [creatures], slept: n, on } for messages and the codex.
export function wakeDweller(e, i = 0) {
  const W = ROOF_DWELLERS.wake; e.roofWakeTotal = W.seconds + i * W.stagger; e.roofWake = e.roofWakeTotal; e.aggro = true; e.roofReturning = false; e.roofPursue = null; e.roofLast = { x: e.x, y: e.y }; return e;
}
function sleepDweller(e) {
  const H = e.roofHome || { x: e.x, y: e.y }; e.x = H.x; e.y = H.y; e.aggro = false; e.roofWake = 0; e.roofReturning = false; e.roofPursue = null; e.aloft = false; e.untargetable = false; e.hidden = false; e.hopLift = 0;
  if (e.pack) { const cd = e.pack.cd || {}; e.pack = { ...e.pack, state: "move", attack: null, phase: null, t: 0, tele: null, data: null, cd: { ...cd } }; }
  return e;
}
export function roofTick(host, dt) {
  const R = host?.roof; if (!R) return null;
  const D = ROOF_DWELLERS, p = host.player, on = onRoof(host.map, p), woke = [], toSleep = [];
  if (on && R.sleepers.length) for (let i = 0; i < R.sleepers.length; i++) { const e = R.sleepers[i]; if (Math.hypot(e.x - p.x, e.y - p.y) > D.wake.radius) continue; R.sleepers.splice(i--, 1); host.enemies.push(wakeDweller(e, woke.length)); woke.push(e); }
  for (const e of host.enemies) {
    if (!e.roofDweller || e.dead || woke.includes(e)) continue;
    if (e.roofWake > 0) e.roofWake = Math.max(0, e.roofWake - dt);
    const fly = isRoofFlier(e);
    if (on) {
      if (e.roofReturning || e.roofPursue != null) { e.roofReturning = false; e.roofPursue = null; e.aggro = true; }
      if (!fly && !e.aloft) { if (roofAt(host.map, Math.floor(e.x + .5), Math.floor(e.y + .5))) e.roofLast = { x: e.x, y: e.y }; else if (e.roofLast) { e.x = e.roofLast.x; e.y = e.roofLast.y; } } // the ground dwellers stay on the roof
      continue;
    }
    if (!fly) { toSleep.push(e); continue; }
    if (!e.roofReturning) { e.roofPursue = (e.roofPursue ?? D.pursue.seconds) - dt; if (e.roofPursue > 0) continue; e.roofReturning = true; e.roofHomeFor = 0; }
    const H = e.roofHome || { x: e.x, y: e.y }, dx = H.x - e.x, dy = H.y - e.y, d = Math.hypot(dx, dy), step = D.home.speed * dt; e.aggro = false; e.roofHomeFor = (e.roofHomeFor || 0) + dt;
    if (d <= Math.max(D.home.near, step) || e.roofHomeFor >= D.home.seconds) toSleep.push(e); else { e.x += dx / d * step; e.y += dy / d * step; e.facingX = dx >= 0 ? 1 : -1; }
  }
  for (const e of toSleep) { const i = host.enemies.indexOf(e); if (i >= 0) host.enemies.splice(i, 1); R.sleepers.push(sleepDweller(e)); }
  return { on, woke, slept: toSleep.length };
}
// Does this creature take no part in the fight right now (waking, or flying home)? updatePackMonster asks.
export const roofIdle = (e) => !!(e?.roofDweller && (e.roofWake > 0 || e.roofReturning));
