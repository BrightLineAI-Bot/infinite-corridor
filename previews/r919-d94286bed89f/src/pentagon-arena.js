// The Pentagon's finale arena: the Stillworks (Tim, 2026-11-04: "The red dragon, the black dragon, the Void Walker or the Astral
// Worm can be finales for the Pentagon, and we can come up with some other finale creature. They should be pretty impactful... The
// finale should have a really beautiful, excellent arena: not picturesque or earthly, but the arena of a world or civilization so
// advanced, beyond what we can conceive, that their technology just appears to be rock formations or structures. We make finely
// structured chips at the nanometer scale sitting on unstructured substrate; their technology is so finely structured everywhere
// that it is indistinguishable from rock. Technology and nature and the world around them aren't separate things: it's a
// manipulation of reality and density.").
//
// The way: when the Regent falls, the vault's opened wall (pentagon.ts PENTAGON.finale) leads first here, to a floor of its own
// (`${base}:arena`); the far gate is sealed until the finale beast falls, then opens onto the Starfield walkway and its dais. A
// Pentagon whose walkway was already open before the arena existed (history `pentFinale` with no `pentArena`) keeps its wall onto
// the walkway as it was. The beast is picked once per Pentagon, by hash of its id, from the roster rows whose creature exists
// (`pentagonArenaRoster`), and pinned in the base floor's history (`pentArenaBeast`); it pays once (`pentArenaWon`).
//
// All pure: the floor, the pick and the vitals. game.ts lays the way in, spawns, tunes and rewards (pentagonArena*), and
// pentagon-arena-render.ts draws it.
import { hashSeed, byHash } from "./random.js?v=r919-d94286bed89f";
import { pentagonPlan, pentagonVaultId, pentagonFinaleId } from "./pentagon.js?v=r919-d94286bed89f";
import { WORLD_BEASTS, liveBeastReference, BEAST_BALANCE, BEAST_BASELINE } from "./world-beasts.js?v=r919-d94286bed89f";

// The finale's own creature, the Gloomvast (haunts.ts GLOOM_FINALE: a haunt grown grand, with its Dark). While `kind` names no creature
// the pick leaves it out.
export const FINALE_GHOST = { kind: "gloomvast", name: "The Gloomvast", profile: { hitsToKill: 72.5, hpPerLevel: 37.5, damageShare: .1528, staggerResistance: .7, speed: 1, attackGap: .55 } }; // haunts.ts GLOOM_FINALE: its author's values, which cancel this row's factors and BEAST_BALANCE

export const PENTAGON_ARENA = {
  // The arena's version, pinned per Pentagon in its base floor's history (`pentArena`) when its wall opens: 1 is release 754's floor;
  // 2 is the same floor with the pillars (`cover`). A Pentagon keeps the version it opened with, so no arena already laid changes.
  version: 2,
  pick: 1, // the beast pick's hash version: fixed, so a new floor version never changes which beast a Pentagon gets
  grain: 1, // the floor's own hash version: every version lays release 754's floor, and later versions only add to it
  // The floor: a five-sided plain (point toward the far gate), `radius` its circumradius in tiles, centred at `centre`, inside a
  // map of `size`; everything else is the formations. `band`: how many density bands the floor's grain falls into toward its rim.
  size: [41, 39], centre: [20.5, 21], radius: 18, band: 4, dither: 1.1, // dither: how far a tile's band may stray (in bands), so the density grades rather than steps
  links: .58, // the share of joins between neighbouring formation tiles that a ridge crosses (the dendrite's branching)
  inlay: 3.6, // the five-fold figure at the heart of the floor (tiles)
  monoliths: { count: 5, ring: 10, turn: -90 }, // standing lattices round the heart, one toward each corner (turn: degrees of the first)
  // Cover (Tim, 2026-11-05: "a few pillars... that the Wayfarer can hide behind from the Sunfall"), from version `from`: `count`
  // pillars of `size`×`size` formation tiles, one between each pair of standing lattices on a ring of `ring` tiles round the heart
  // (`turn`: degrees of the first, off the axis between the two ways so the walk from the door to the heart stays straight). None
  // stands within `clear` tiles of a way's inner tile or of the beast's place. They are ordinary blocked stone, so movement, paths,
  // beams and shots already stop at them; the Sunfall (monster-pack.ts dragonSupernova) spares a Wayfarer whose line to the beast
  // a pillar or lattice cuts, in such an arena only (game.ts sunfallShaded).
  cover: { from: 2, count: 5, ring: 6.5, turn: -36, size: 2, clear: 3 },
  wake: 12.5, // the beast wakes when the Wayfarer comes this near (tiles), or is struck
  // The finale beasts. `beast`: the WORLD_BEASTS profile whose moves, renderer and kin it is; `hp` and `damage` scale its vitals,
  // measured against the Wayfarer as world beasts are (pentagonArenaVitals). The damage factors put each one's biggest ordinary
  // blow at about 40% of the Wayfarer's health (two or three of them kill); the health factors make a fight of 20 s to a minute
  // for a strong build. From ring 100 out the regional ramp takes over where it is higher (game.ts tunePentagonArenaBeast).
  roster: [
    { id: "crimsonTyrant", kind: "crimsonTyrant", beast: "crimsonTyrant", hp: 1.5, damage: 1.35 },
    { id: "doomChaser", kind: "doomChaser", beast: "doomChaser", hp: 1.6, damage: 1.35 },
    { id: "voidWalker", kind: "voidWalker", beast: "voidWalker", hp: 2.4, damage: 2.15 },
    { id: "astralWorm", kind: "astralWorm", beast: "astralWorm", hp: 3, damage: 2.15 },
    { id: "gloomvast", kind: FINALE_GHOST.kind, profile: FINALE_GHOST.profile, hp: 1.6, damage: 1.6, name: FINALE_GHOST.name },
  ],
  bounty: { marks: 240, perLevel: 24 }, // paid once, when the finale beast falls (the beast's usual drops come with it)
  names: {
    floor: "The Stillworks",
    gateIn: "The opened wall · the Stillworks",
    back: "The way back · the Regent's Vault",
    on: "A seam in the stone · sealed",
    onOpen: "The opened seam · a walkway among the stars",
    walkBack: "The opened seam · back to the Stillworks",
    monolith: "A standing lattice",
  },
  notice: "THE STILLWORKS", wonNotice: "THE FINALE FALLS", openNotice: "THE SEAM OPENS",
  messages: {
    enter: "Beyond the wall the floor is stone, and then, as you look, it is not: every grain of it is ordered, ridges branching into ridges into ridges, finer than sight, and somewhere far down in it something is counting.",
    wake: "The floor's slow counting stops. Something here has been waiting for whoever finished the Pentagon.",
    sealed: "The seam in the stone will not part while the Stillworks' keeper lives.",
    opens: "The ordered stone draws back along a seam no wider than a thought, and beyond it are the stars.",
    back: "You step back through the wall, into the Regent's Vault.",
    walkBack: "You step back through the seam, onto the ordered stone of the Stillworks.",
    monolith: "It reads as rock: a standing slab of it, weathered. Look closer and the weathering is a lattice, the lattice is made of lattices, and none of it has ever worn.",
    shaded: "The Sunfall breaks over the stone and pours past on either side. In its shadow, you live.",
  },
};

// ------------------------------------------------------------------------------------------------ ids
export const pentagonArenaId = (base) => `${base}:arena`;
const ARENA_ID = /^(pentagon:(.+):(-?\d+):(-?\d+)(?::v(\d+))?):arena$/;
export const isPentagonArenaId = (id) => ARENA_ID.test(String(id || ""));
export function parsePentagonArenaId(id) { const m = String(id || "").match(ARENA_ID); return m ? { base: m[1], seed: m[2], cx: Number(m[3]), cy: Number(m[4]), V: Number(m[5] || 1) } : null; }

// ------------------------------------------------------------------------------------------------ the pick
// The rows whose creature exists (`isKind(kind)`), in table order.
export function pentagonArenaRoster(isKind = () => true) { return PENTAGON_ARENA.roster.filter((r) => r.kind && isKind(r.kind) && (r.beast ? !!WORLD_BEASTS[r.beast] : !!r.profile)); }
export const pentagonArenaRow = (id) => PENTAGON_ARENA.roster.find((r) => r.id === id) || null;
// The finale beast of a Pentagon (its base id): each available row ranked by a hash of the Pentagon and the row, the first wins, so a
// row added later takes only the Pentagons it ranks first in (about one in five) and changes no other pick. Pinned in history once
// chosen (game.ts), so a Pentagon keeps its beast whatever joins the roster.
export function pentagonArenaPick(seed, base, isKind = () => true) {
  const rows = pentagonArenaRoster(isKind); if (!rows.length) return null;
  return [...rows].sort(byHash((r) => `${seed}:${base}:pentagon-arena:v${PENTAGON_ARENA.pick}:${r.id}`))[0];
}

// ------------------------------------------------------------------------------------------------ the vitals
// Like a world beast's (world-beasts.ts beastProfileVitals), measured against the Wayfarer as they stand now (liveBeastReference:
// the Stage 1 hold is for the roaming beasts, not the Pentagon's finale), then scaled by the row. `regional` ({ hpMultiplier,
// damageMultiplier }, already ramped from ring 100 to 150) takes over only where it is higher than the row's factor, so the finale
// is never softer than the same beast met on the land there.
export function pentagonArenaVitals(row, save, stats = {}, regional = null) {
  const P = row?.profile || WORLD_BEASTS[row?.beast]; if (!P) return null; const r = liveBeastReference(save, stats);
  const hp = BEAST_BALANCE.hp * Math.max(Number(P.nativeHpFloor) || 0, r.perHit * P.hitsToKill + P.hpPerLevel * r.level);
  // The row's damage factor raises the share of the Wayfarer's health, not the floors under it: a young Wayfarer, already held at
  // the floor (two blows from a world beast), is not one-shot by the finale; a strong one meets two or three.
  const floor = Math.max(Number(P.nativeDamageFloor) || 0, Math.ceil(BEAST_BASELINE.damageFloor / (1 - r.guard))), share = r.maxHp * P.damageShare / (1 - r.guard), rd = Number(regional?.damageMultiplier) || 1;
  const kh = Math.max(row.hp || 1, Number(regional?.hpMultiplier) || 1), damage = BEAST_BALANCE.damage * Math.max(floor * rd, share * Math.max(row.damage || 1, rd));
  return { hp: Math.max(1, Math.round(hp * kh)), damage: Math.max(1, Math.round(damage)), staggerResistance: P.staggerResistance, speed: P.speed, attackGap: P.attackGap };
}

// ------------------------------------------------------------------------------------------------ the floor
// A pentagon's edges: outward unit normals and the inradius.
function pentagonEdges(R) { const out = []; for (let k = 0; k < 5; k++) { const a = (-54 + 72 * k) * Math.PI / 180; out.push({ x: Math.cos(a), y: Math.sin(a) }); } return { normals: out, inner: R * Math.cos(Math.PI / 5) }; }
// How far inside the five-sided floor a point is (tiles; negative outside).
export function arenaDepth(x, y) { const A = PENTAGON_ARENA, [cx, cy] = A.centre, E = pentagonEdges(A.radius); let d = Infinity; for (const n of E.normals) d = Math.min(d, E.inner - ((x - cx) * n.x + (y - cy) * n.y)); return d; }
// The arena floor. Floor `stillFloor` (its `band` the density of its grain, 0 at the heart to `band - 1` at the rim; `lit` when a
// formation stands to its north: the stone there gives light rather than shade; `inlay` within `inlay` of the heart, which knows the
// heart's centre); formations `stillRidge`, blocked (`rim`: which of its four sides meet floor, for its ridges and faces); five
// standing lattices; the way back (south) and the sealed seam (north, at the floor's point); the beast at the heart.
// `version`: the arena's (game.ts passes the one pinned in history). Version 1 is release 754's arena byte for byte; version 2 adds
// the pillars (`cover`) and lists them in `stillworks.pillars` for the renderer.
export const pentagonArenaVersion = (v) => { const n = Math.floor(Number(v)); return n >= 1 ? Math.min(n, PENTAGON_ARENA.version) : 1; };
// The pillars' places: [{ x, y, size, k }] (x, y: the top-left tile), each whole on open floor and clear of `keep`.
function arenaPillars(at, keep) {
  const A = PENTAGON_ARENA, C = A.cover, [cx, cy] = A.centre, out = [];
  for (let k = 0; k < C.count; k++) { const a = (C.turn + 360 / C.count * k) * Math.PI / 180, x = Math.round(cx + Math.cos(a) * C.ring - C.size / 2), y = Math.round(cy + Math.sin(a) * C.ring - C.size / 2); let ok = true;
    for (let j = 0; j < C.size && ok; j++) for (let i = 0; i < C.size && ok; i++) { const t = at(x + i, y + j); if (!t || t.blocked || keep.some((q) => Math.hypot(x + i - q.x, y + j - q.y) < C.clear)) ok = false; }
    if (ok) out.push({ x, y, size: C.size, k }); }
  return out;
}
export function generatePentagonArena(seed, id, row = null, version = PENTAGON_ARENA.version) {
  const Pp = parsePentagonArenaId(id); if (!Pp) return null; const plan = pentagonPlan(Pp.seed, Pp.cx, Pp.cy, Pp.V), A = PENTAGON_ARENA, [W, H] = A.size, [cx, cy] = A.centre, V = pentagonArenaVersion(version);
  const h = (k) => hashSeed(`${id}:stillworks:v${A.grain}:${k}`), inside = (x, y) => arenaDepth(x + .5, y + .5) >= .35;
  const tiles = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push({ x, y, kind: "stillRidge", blocked: true, detail: h(`d${x},${y}`) % 8 });
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : tiles[y * W + x]);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (inside(x, y)) { const d = arenaDepth(x + .5, y + .5), r = Math.hypot(x + .5 - cx, y + .5 - cy);
    tiles[y * W + x] = { x, y, kind: "stillFloor", blocked: false, detail: tiles[y * W + x].detail, band: Math.max(0, Math.min(A.band - 1, Math.floor((1 - Math.min(1, d / (A.radius * .62))) * A.band + ((h(`b${x},${y}`) % 1000) / 1000 - .5) * A.dither))), ...(r <= A.inlay ? { inlay: true, inlayX: cx, inlayY: cy } : {}) }; }
  // the five standing lattices (1 tile each, blocked), one toward each corner of the floor
  const objects = []; for (let k = 0; k < A.monoliths.count; k++) { const a = (A.monoliths.turn + 72 * k) * Math.PI / 180, x = Math.floor(cx + Math.cos(a) * A.monoliths.ring), y = Math.floor(cy + Math.sin(a) * A.monoliths.ring), t = at(x, y);
    if (!t || t.blocked) continue; tiles[y * W + x] = { x, y, kind: "stillRidge", blocked: true, detail: t.detail, monolith: true }; objects.push({ id: `still-monolith-${k}`, kind: "stillMonolith", name: A.names.monolith, x, y, h: h(`m${k}`) % 1000, state: "still", actions: [], lore: A.messages.monolith }); }
  // the pillars (version 2): blocked formation, laid before the ridges are joined so their faces and the stone's light follow them
  const col = Math.floor(cx); let pillars = null;
  if (V >= A.cover.from) { const keep = [{ x: col, y: Math.round(cy) - 1 }]; // the beast's place, and the inner tile of each way (the first and last floor tile of the middle column)
    for (let y = 0; y < H; y++) if (!at(col, y).blocked) { keep.push({ x: col, y }); break; } for (let y = H - 1; y >= 0; y--) if (!at(col, y).blocked) { keep.push({ x: col, y }); break; }
    pillars = arenaPillars(at, keep); for (const q of pillars) for (let j = 0; j < q.size; j++) for (let i = 0; i < q.size; i++) { const x = q.x + i, y = q.y + j; tiles[y * W + x] = { x, y, kind: "stillRidge", blocked: true, detail: tiles[y * W + x].detail, pillar: q.k + 1 }; } }
  const edge = (x, y, i) => i === 0 ? `h${x},${y - 1}` : i === 1 ? `v${x},${y}` : i === 2 ? `h${x},${y}` : `v${x - 1},${y}`; // each join named once, the same from either side
  for (const t of tiles) { if (t.blocked) { let rim = 0, links = 0; [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], i) => { const q = at(t.x + dx, t.y + dy); if (q && !q.blocked) rim |= 1 << i; else if ((h(edge(t.x, t.y, i)) % 1000) / 1000 < A.links) links |= 1 << i; }); t.rim = rim; t.links = links; }
    else { const n = at(t.x, t.y - 1); if (n?.blocked) t.lit = true; } }
  // the ways: the back gate in the middle of the south edge, the seam at the floor's northern point
  let by = H - 2; while (by > 0 && at(col, by - 1)?.blocked) by--; let ty = 1; while (ty < H - 1 && at(col, ty + 1)?.blocked) ty++;
  const entry = { x: col, y: by - 1 }, vault = pentagonVaultId(plan), walk = pentagonFinaleId(Pp.base);
  objects.push({ id: "pent-arena-back", kind: "pentArenaGate", to: "vault", name: A.names.back, x: col, y: by, inner: { x: col, y: by - 1 }, toId: vault, face: "south", state: "open", actions: ["use"], lore: A.messages.back },
    { id: "pent-arena-on", kind: "pentArenaGate", to: "walk", name: A.names.on, x: col, y: ty, inner: { x: col, y: ty + 1 }, toId: walk, face: "north", state: "sealed", actions: ["use"], lore: A.messages.sealed });
  // Version 9 changes ordinary interiors, not Stillworks combat. Keep its actor's
  // attack hashes on version 8 while the map, gates and reward history retain their real IDs.
  const combatId = Pp.V === 9 ? id.replace(/:v9:arena$/, ":v8:arena") : id;
  const enemySpawns = row ? [{ id: `${combatId}:finale`, kind: row.kind, x: col, y: Math.round(cy) - 1, boss: true, traits: [], pentFinaleBeast: row.id }] : [];
  return { seed, id, recipe: "greatBuilding", name: `Pentagon · ${A.names.floor}`, identity: `Pentagon: ${A.names.floor}`, danger: "the finale", width: W, height: H, tiles, entry, exit: null, objects, enemySpawns,
    building: { base: Pp.base, style: "keep", floor: 3 + plan.nh, floors: 3 + plan.nh, pentagon: true, finale: true, arena: true, V: plan.V, node: -1, kind: "stillworks", of: plan.nodes.length, keys: [], entries: {}, exitsTo: {}, vault: false, breachEntry: null, roofLadder: null, fallTo: null },
    pentArena: V, arena: true, stillworks: { cx, cy, radius: A.radius, ...(pillars ? { cover: true, pillars: pillars.map((q) => ({ x: q.x, y: q.y, size: q.size, v: h(`p${q.k}`) % 4 })) } : {}) }, movers: [], watcherPlaced: true, layoutVersion: 1, themePool: 0 };
}
