// Seed realms (Tim, 2026-11-11): the teleportation shrines (the Watcher's tombs above ground: the coffin with the sigil and the
// violet glow) take a Pumice or a Crimson Seed. The seed opens an annex off the corridor that is never kept: you explore it, and
// when you leave it (its Fading Rift by the way in, or the Way Onward once its heart falls) it comes apart for good and you are
// set down somewhere else, beside another of the Watcher's shrines when one you know is near enough, else far off.
//
// - Pumice Seed: the Hollow Husk, an old mining world bored out to its shell. Islands of rock hang over the stars, joined by
//   the pathways the miners left (some only trestles), and ghosts walk them: Gloomwisps and the husk's own dead.
// - Crimson Seed: a great ship adrift. Plated decks, glass floors and windows that look out on the galaxy, a hangar open to
//   space crossed on catwalks, robots on watch, and some of the cosmos's own creatures come aboard.
//
// Generation is a pure function of the world seed, the realm's kind and the count of that seed used (`seedPouch.used`), versioned
// by SEED_REALMS.version in the realm's id (`seedrealm:<seed>:v<N>:<kind>:<n>`): the same id always lays the same realm, and a
// later version never changes one already open. Nothing of the map is stored: while you are inside, the save holds the small
// session record (SEED_REALM_SESSION), the realm's dungeon history (what was paid, the beacon, done) and the usual area
// snapshot (creatures and objects, no tiles), so a reload resumes it exactly; all of it is dropped when you leave.
// A save that names a realm it cannot resume (an unknown version, a broken record) puts the Wayfarer back where they stood
// before entering (ensureSeedRealmSession).
//
// Rewards: more Aperture Crystals than any crossing holds (each widens the Aperture once), caches, now and then a seed, and
// Divine Viscera when the realm's heart falls (once). Never a Tesseract: those come only from keeps and the Pentagon.
// Pure rules and generation; game.ts runs it, seed-realm-render.ts draws it.
import { hashSeed, rng } from "./random.js?v=r929-918c50ebeb43";
import { annotateDungeon } from "./dungeon-framework.js?v=r929-918c50ebeb43";

export const SEED_REALMS = {
  version: 1,
  prefix: "seedrealm",
  seeds: { pumice: "husk", crimson: "ship" }, // which seed opens which realm
  activeCap: 8, // creatures simulated at once (arenas.ts activeDungeonEnemies)
  maxSpawns: 42, // every placed creature, wisps included (a wisp splits at most HAUNT.split.max times, up to HAUNT.split.cap)
  minFromEntry: 7, // no creature this close to the way in
  threat: { hp: 1.25, damage: 1.15 }, // over the regional threat of the ground the seed was used on
  crystal: { aperture: 3 }, // each Aperture Crystal, once
  cache: [{ id: "marks", label: "marks", weight: 40, n: [40, 90] }, { id: "lumenDust", label: "Lumen Dust", weight: 20, n: [2, 4] }, { id: "cinderIron", label: "Cinder Iron", weight: 20, n: [2, 4] }, { id: "weaponSphere", label: "a Weapon Sphere", weight: 10, n: [1, 1] }, { id: "armorSphere", label: "an Armor Sphere", weight: 10, n: [1, 1] }],
  seed: { chance: .3, weights: [["pumice", 3], ["crimson", 3], ["opal", 2], ["fossilized", 2]] }, // a seed lying somewhere inside
  viscera: { base: 2, perRings: 25, max: 5 }, // when the heart falls: base, +1 for each `perRings` rings out from Ember Refuge, at most `max`
  exit: { hop: [6, 16], near: 12 }, // where leaving sets you down: a known Watcher's shrine within `near` sections, else `hop` sections off
  husk: {
    name: "The Hollow Husk", label: "a mining world bored hollow", size: 64,
    islands: [11, 14], radius: [4, 6], entryRadius: 4, heartRadius: 6, gap: 11, extraLinks: 3, bridgeShare: .3, pathWidth: 2,
    pillars: [8, 14], pits: [5, 10],
    crystals: [5, 7], caches: [3, 4], lore: 2,
    perIsland: [1, 3], kinds: [["hollowMiner", 4], ["veinWraith", 3], ["gloomwisp", 2]], knots: [2, 3], knot: 3, // knots of wisps (five together pour into a Gloomgorge)
    heart: "lastForeman",
  },
  ship: {
    name: "The Drifting Ship", label: "a great ship adrift among the stars", size: 64,
    hull: { bow: 5, stern: 59, width: 17, taper: 12 }, promenade: [15, 16], roomEvery: 7, roomSkip: .15, room: { w: [6, 10], h: [4, 6] },
    glassSpine: [.35, .6], windowShare: .6, observatory: .2, hangar: true,
    crystals: [4, 6], caches: [3, 4], lore: 2,
    perRoom: [1, 2], kinds: [["deckSentry", 4], ["hullWarden", 3], ["riveter", 3], ["riftLynx", 1], ["lumenWraith", 1], ["voidSentinel", 1]],
    heart: "helmSovereign",
  },
  lore: {
    husk: [
      "Scratched into the rock beside a rail: the shift tallies, hundreds of them, and below them all, in another hand: WE WENT TOO DEEP AND FOUND THE OUTSIDE.",
      "A lamp hook, and under it a name worn smooth by thumbs. Whoever touched it for luck touched it for a long time.",
      "A survey plate: the world's core is marked in red and crossed through. Under it someone has written: sold.",
      "The rails end at the edge. Past it, nothing: stars below, stars above. The miners kept digging after there was nothing to dig.",
    ],
    ship: [
      "A crew roster on a cracked panel. Every name is struck through but one, and that one is the ship's own.",
      "A star chart, the course drawn in pale light, looping back on itself again and again. The ship has been going round for a long time.",
      "A notice: OBSERVATION DECK CLOSED FOR REPAIR. The glass beneath it is whole. Whatever needed repairing was not the glass.",
      "The helm's log, one line repeated: HOLDING COURSE. HOLDING COURSE. HOLDING COURSE.",
    ],
  },
  text: {
    offer: (name) => `Offer a ${name}`,
    enter: { husk: "The seed sinks into the sigil. The eye opens on a world bored hollow, and you step down into it.", ship: "The seed sinks into the sigil. The eye opens on a great ship drifting through the dark, and you are aboard." },
    rift: "Step through the Fading Rift (the realm comes apart for good)",
    onward: "Take the Way Onward (the realm comes apart for good)",
    sealed: "The Way Onward is dark. It opens when the heart of this place falls.",
    left: "Behind you the realm comes apart like smoke, and is gone. You stand somewhere else.",
    leftShrine: "Behind you the realm comes apart like smoke, and is gone. You stand beside another of the Watcher's shrines.",
    beacon: "The beacon takes your light. Fall here, and you rise here.",
    beaconLit: "The beacon burns. You rest a moment.",
    won: { husk: "The Last Foreman falls apart into dust and lamp-light. The Way Onward opens.", ship: "The Helm Sovereign powers down. The Way Onward opens." },
  },
};

const SEED_KINDS = Object.keys(SEED_REALMS.seeds);
export const realmSeedKinds = () => SEED_KINDS.slice();
export const realmOfSeed = (kind) => SEED_REALMS.seeds[kind] || null;
export const seedRealmId = (seed, kind, n, v = SEED_REALMS.version) => `${SEED_REALMS.prefix}:${seed}:v${v}:${kind}:${n}`;
export const isSeedRealmId = (id) => typeof id === "string" && id.startsWith(`${SEED_REALMS.prefix}:`);
// { seed, v, kind, realm, n } or null. The seed may hold colons; the last three parts are the version, kind and count.
export function parseSeedRealmId(id) {
  if (!isSeedRealmId(id)) return null;
  const parts = id.split(":"); if (parts.length < 5) return null;
  const n = Number(parts.pop()), kind = parts.pop(), vs = parts.pop(), seed = parts.slice(1).join(":"), v = /^v\d+$/.test(vs) ? Number(vs.slice(1)) : NaN;
  if (!seed || !Number.isSafeInteger(n) || n < 1 || !Number.isSafeInteger(v) || v < 1 || !SEED_REALMS.seeds[kind]) return null;
  return { seed, v, kind, realm: SEED_REALMS.seeds[kind], n };
}
// Versions this release can lay (a realm opened by a later release cannot be resumed here: the Wayfarer is set back outside).
export const seedRealmVersionKnown = (v) => v === 1;

// ------------------------------------------------------------------------------------------------ the session record
// save.session.seedRealm: null, or { v: 1, id, kind, from: { rx, ry }, dest: { rx, ry, x?, y? } }.
export function validSeedRealmState(q) {
  const p = q && typeof q === "object" ? parseSeedRealmId(q.id) : null;
  return !!p && q.v === 1 && q.kind === p.kind && [q.from?.rx, q.from?.ry, q.dest?.rx, q.dest?.ry].every(Number.isSafeInteger)
    && (q.dest.x === undefined || (Number.isFinite(q.dest.x) && Number.isFinite(q.dest.y)));
}
const validPlace = (q) => q && [q.rx, q.ry].every(Number.isSafeInteger) && [q.x, q.y].every(Number.isFinite);
// Normalised in freshSave and migrateSave. A record that is not sound becomes null; a save inside a realm that cannot be
// resumed (no sound record for it, or a version this release does not know) is put back outside, where the Wayfarer stood
// before going in (the session's dungeonReturn), else at the heart of its own section. Returns the save.
export function ensureSeedRealmSession(save) {
  const s = save?.session; if (!s || typeof s !== "object") return save;
  if (!validSeedRealmState(s.seedRealm)) s.seedRealm = null;
  const id = s.activeDungeonId;
  if (s.area === "dungeon" && isSeedRealmId(id)) {
    const p = parseSeedRealmId(id), ok = p && seedRealmVersionKnown(p.v) && s.seedRealm?.id === id;
    if (!ok) {
      const back = validPlace(s.dungeonReturn) ? s.dungeonReturn : { rx: Number.isSafeInteger(s.rx) ? s.rx : 0, ry: Number.isSafeInteger(s.ry) ? s.ry : 0, x: 16, y: 16 };
      Object.assign(s, { area: "overworld", rx: back.rx, ry: back.ry, x: back.x, y: back.y, activeDungeonId: null, activeDungeonLevelId: null, dungeonReturn: null, seedRealm: null });
      dropSeedRealms(save, null);
    }
  } else if (s.seedRealm && !(s.area === "dungeon" && s.activeDungeonId === s.seedRealm.id)) s.seedRealm = null;
  return save;
}
// Forget every realm but `keep` (its snapshots and histories): a realm left is gone for good.
export function dropSeedRealms(save, keep = save?.session?.seedRealm?.id || null) {
  let n = 0; const areas = save?.session?.areas, hist = save?.consequences?.dungeons;
  for (const bag of [areas, hist]) if (bag && typeof bag === "object") for (const k of Object.keys(bag)) if (isSeedRealmId(k) && !(keep && (k === keep || k.startsWith(`${keep}:`)))) { delete bag[k]; n++; }
  return n;
}

// ------------------------------------------------------------------------------------------------ rewards
export function realmViscera(rx, ry) {
  const V = SEED_REALMS.viscera, ring = Math.floor(Math.hypot(Number(rx) || 0, Number(ry) || 0));
  return Math.min(V.max, V.base + Math.floor(ring / V.perRings));
}
// What cache `key` holds: { id, label, n }. Pure.
export function realmCacheFind(key) {
  const T = SEED_REALMS.cache, total = T.reduce((a, f) => a + f.weight, 0), h = hashSeed(`realm-cache:v1:${key}`); let r = h % total;
  for (const f of T) { if (r < f.weight) return { id: f.id, label: f.label, n: f.n[0] + ((h >>> 9) % (f.n[1] - f.n[0] + 1)) }; r -= f.weight; }
  return { id: "marks", label: "marks", n: 40 };
}
function pickWeighted(list, h) { const total = list.reduce((a, [, w]) => a + w, 0); let r = h % total; for (const [k, w] of list) { if (r < w) return k; r -= w; } return list[0][0]; }
// The seed lying in realm `id`, or null. Pure.
export function realmSeedRoll(id) {
  const S = SEED_REALMS.seed; if ((hashSeed(`realm-seed:v1:${id}`) % 10000) / 10000 >= S.chance) return null;
  return pickWeighted(S.weights, hashSeed(`realm-seed-kind:v1:${id}`));
}
// Where leaving realm `id` (opened at `from`) sets the Wayfarer down: the nearest-but-one known Watcher's shrine within
// `exit.near` sections (from the Atlas), else a section `exit.hop` off in a direction drawn from the id. { rx, ry, x?, y? }.
export function realmDestination(atlas, id, from) {
  const E = SEED_REALMS.exit, shrines = [];
  for (const [key, a] of Object.entries(atlas || {})) {
    const [rx, ry] = key.split(",").map(Number); if (!Number.isSafeInteger(rx) || !Number.isSafeInteger(ry) || (rx === from.rx && ry === from.ry)) continue;
    const d = Math.hypot(rx - from.rx, ry - from.ry); if (d > E.near) continue;
    for (const q of Array.isArray(a?.sites) ? a.sites : []) if (q?.kind === "watcherTomb" && Number.isFinite(q.x) && Number.isFinite(q.y)) shrines.push({ rx, ry, x: q.x, y: q.y, d });
  }
  if (shrines.length) { shrines.sort((a, b) => a.d - b.d || a.rx - b.rx || a.ry - b.ry); const q = shrines[hashSeed(`${id}:dest`) % Math.min(3, shrines.length)]; return { rx: q.rx, ry: q.ry, x: q.x, y: q.y }; }
  const h = hashSeed(`${id}:hop`), d = E.hop[0] + h % (E.hop[1] - E.hop[0] + 1), a = ((h >>> 8) % 3600) / 3600 * Math.PI * 2;
  return { rx: from.rx + Math.round(Math.cos(a) * d), ry: from.ry + Math.round(Math.sin(a) * d) };
}

// ------------------------------------------------------------------------------------------------ generation
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const span = (r, [lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));
const walk = (t) => !!t && !t.blocked && !t.chasm;
// Tiles reachable on foot from (x, y): a Uint8Array over the map (base movement: four ways, no jumping, no swimming).
export function realmReach(map, from = map.entry) {
  const W = map.width, H = map.height, seen = new Uint8Array(W * H), q = [], s = Math.round(from.y) * W + Math.round(from.x);
  if (!walk(map.tiles[s])) return seen; seen[s] = 1; q.push(s);
  for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && walk(map.tiles[j])) { seen[j] = 1; q.push(j); } } }
  return seen;
}
// The solver: is every way out, reward, beacon, story piece and creature (the heart above all) reachable from the way in on
// foot, standing on sound floor? Returns the list of problems ([] when sound).
export function realmProblems(map) {
  const out = [], seen = realmReach(map), at = (p) => Math.round(p.y) * map.width + Math.round(p.x);
  if (!walk(map.tiles[at(map.entry)])) out.push("entry is not floor");
  for (const o of map.objects) { if (!walk(map.tiles[at(o)])) out.push(`${o.id} not on floor`); else if (!seen[at(o)]) out.push(`${o.id} unreachable`); }
  for (const e of map.enemySpawns) { if (!walk(map.tiles[at(e)])) out.push(`${e.id} not on floor`); else if (!seen[at(e)]) out.push(`${e.id} unreachable`); }
  for (const o of map.objects) if (o.rise && (!walk(map.tiles[at(o.rise)]) || !seen[at(o.rise)])) out.push(`${o.id} rises off the floor`);
  if (!map.objects.some((o) => o.realmObject === "exit" && !o.onward)) out.push("no rift");
  if (!map.objects.some((o) => o.realmObject === "exit" && o.onward)) out.push("no way onward");
  if (map.enemySpawns.filter((e) => e.seedRealmHeart).length !== 1) out.push("heart count");
  return out;
}

function baseMap(seed, id, p, R) {
  const W = R.size, H = R.size, tiles = new Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles[y * W + x] = { x, y, kind: "abyss", blocked: false, environment: "abyss", chasm: true, realm: p.realm, detail: hashSeed(`${id}:d:${x},${y}`) % 4 };
  return { W, H, tiles, at: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : tiles[y * W + x]) };
}
const setTile = (t, kind, extra = {}) => { if (!t) return; const realm = t.realm, detail = t.detail; for (const k of Object.keys(t)) if (k !== "x" && k !== "y") delete t[k]; Object.assign(t, { kind, blocked: false, realm, detail }, extra); };
const FLOOR = (kind, extra) => (t) => setTile(t, kind, extra);

// Connectivity guard: apply `patch` (a list of [tile, fn]) and keep it only if every point in `need` stays reachable from
// `from`; otherwise undo it. Tiles are restored from shallow copies.
function guarded(map, from, need, cells, fn) {
  const saved = cells.map((t) => ({ t, was: { ...t } })); for (const t of cells) fn(t);
  const seen = realmReach(map, from), ok = need.every((p) => seen[Math.round(p.y) * map.width + Math.round(p.x)]);
  if (!ok) for (const { t, was } of saved) { for (const k of Object.keys(t)) delete t[k]; Object.assign(t, was); }
  return ok;
}

function generateHusk(seed, id, p) {
  const R = SEED_REALMS.husk, r = rng(`${seed}:seed-realm:v1:husk:${id}`), { W, H, tiles, at } = baseMap(seed, id, p, R);
  const blob = (cx, cy, rad, key) => { const out = []; for (let y = -rad - 1; y <= rad + 1; y++) for (let x = -rad - 1; x <= rad + 1; x++) {
    const a = Math.atan2(y, x), wob = 1 + .22 * Math.sin(a * 3 + (hashSeed(`${key}:w`) % 628) / 100) + .12 * Math.sin(a * 5 + (hashSeed(`${key}:v`) % 628) / 100);
    if (Math.hypot(x, y) <= rad * wob && cx + x > 1 && cy + y > 1 && cx + x < W - 2 && cy + y < H - 2) out.push(at(cx + x, cy + y)); } return out; };
  // the islands: the way in at the foot, the heart at the head, the rest scattered with a gap between them
  const islands = [{ x: (W >> 1) + span(r, [-4, 4]), y: H - 8, rad: R.entryRadius, role: "entry" }, { x: (W >> 1) + span(r, [-8, 8]), y: 8, rad: R.heartRadius, role: "heart" }];
  const want = span(r, R.islands);
  for (let tries = 0; islands.length < want && tries < 600; tries++) {
    const c = { x: 6 + Math.floor(r() * (W - 12)), y: 10 + Math.floor(r() * (H - 22)), rad: span(r, R.radius), role: "isle" };
    if (islands.every((q) => Math.hypot(q.x - c.x, q.y - c.y) >= Math.max(R.gap, q.rad + c.rad + 3))) islands.push(c);
  }
  islands.forEach((c, i) => { c.i = i; for (const t of blob(c.x, c.y, c.rad, `${id}:isle${i}`)) setTile(t, "huskFloor", { isle: i }); });
  // the pathways: a spanning tree (nearest first), and a few more for loops; some are trestles
  const links = [], inTree = new Set([0]);
  while (inTree.size < islands.length) { let best = null; for (const a of inTree) for (const b of islands) { if (inTree.has(b.i)) continue; const d = Math.hypot(islands[a].x - b.x, islands[a].y - b.y); if (!best || d < best.d) best = { a, b: b.i, d }; } inTree.add(best.b); links.push(best); }
  const pairs = []; for (let a = 0; a < islands.length; a++) for (let b = a + 1; b < islands.length; b++) if (!links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) pairs.push({ a, b, d: Math.hypot(islands[a].x - islands[b].x, islands[a].y - islands[b].y) });
  pairs.sort((u, v) => u.d - v.d || u.a - v.a || u.b - v.b); for (const q of pairs.slice(0, R.extraLinks)) if (q.d < 26) links.push(q);
  for (const [k, l] of links.entries()) {
    const A = islands[l.a], B = islands[l.b], bridge = r() < R.bridgeShare, pts = [A];
    if (!bridge) { const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, nx = -(B.y - A.y), ny = B.x - A.x, nl = Math.hypot(nx, ny) || 1, off = (r() - .5) * 8; pts.push({ x: mx + nx / nl * off, y: my + ny / nl * off }); }
    pts.push(B);
    for (let s = 1; s < pts.length; s++) { const P = pts[s - 1], Q = pts[s], n = Math.ceil(Math.hypot(Q.x - P.x, Q.y - P.y) * 2);
      for (let i = 0; i <= n; i++) { const x = Math.round(P.x + (Q.x - P.x) * i / n), y = Math.round(P.y + (Q.y - P.y) * i / n);
        for (let dy = 0; dy < R.pathWidth; dy++) for (let dx = 0; dx < R.pathWidth; dx++) { const t = at(x + dx, y + dy); if (t && t.chasm && t.x > 0 && t.y > 0 && t.x < W - 1 && t.y < H - 1) setTile(t, bridge ? "huskTrestle" : "huskPath", { link: k, ...(bridge ? { bridgeAxis: Math.abs(Q.x - P.x) > Math.abs(Q.y - P.y) ? "x" : "y" } : {}) }); } } }
  }
  const map = { width: W, height: H, tiles, entry: { x: islands[0].x, y: islands[0].y } }, need = islands.map((c) => ({ x: c.x, y: c.y }));
  // rock left standing (cover) and holes bored through the islands: never cutting an island off
  const isleTiles = (i) => tiles.filter((t) => t.isle === i);
  const far = (t, d) => Math.hypot(t.x - islands[t.isle].x, t.y - islands[t.isle].y) >= d;
  for (let n = span(r, R.pillars), k = 0; n > 0 && k < 60; k++) { const c = islands[1 + Math.floor(r() * (islands.length - 1))], pool = isleTiles(c.i).filter((t) => far(t, 1.5) && !t.blocked); if (!pool.length) continue;
    const t = pool[Math.floor(r() * pool.length)], cells = [t, at(t.x + 1, t.y), at(t.x, t.y + 1)].filter((q) => q?.kind === "huskFloor").slice(0, 1 + Math.floor(r() * 3));
    if (guarded(map, map.entry, need, cells, FLOOR("huskRock", { blocked: true }))) n--; }
  for (let n = span(r, R.pits), k = 0; n > 0 && k < 60; k++) { const c = islands[2 + Math.floor(r() * Math.max(1, islands.length - 2))] || islands[1], pool = isleTiles(c.i).filter((t) => far(t, 2) && !t.blocked && !t.chasm); if (!pool.length) continue;
    const t = pool[Math.floor(r() * pool.length)], cells = [t, at(t.x + 1, t.y), at(t.x, t.y + 1), at(t.x + 1, t.y + 1)].filter((q) => q?.kind === "huskFloor");
    if (guarded(map, map.entry, need, cells, (q) => setTile(q, "abyss", { environment: "abyss", chasm: true, bored: true }))) n--; }
  // ore veins in the rock (paint only)
  for (const t of tiles) if (t.kind === "huskRock" && hashSeed(`${id}:ore:${t.x},${t.y}`) % 3 === 0) t.ore = true;
  return { map, islands, links, r, rooms: islands.map((c) => ({ x: c.x, y: c.y, i: c.i, role: c.role })) };
}

function generateShip(seed, id, p) {
  const R = SEED_REALMS.ship, r = rng(`${seed}:seed-realm:v1:ship:${id}`), { W, H, tiles, at } = baseMap(seed, id, p, R), cx = W >> 1, Hl = R.hull, P = R.promenade;
  // the hull: a long tapering shape, bow up, stern down; solid inside until carved
  const half = (y) => y < Hl.bow || y > Hl.stern ? -1 : y < Hl.bow + Hl.taper ? Math.round(4 + (Hl.width - 4) * Math.sin((y - Hl.bow) / Hl.taper * Math.PI / 2)) : y > Hl.stern - 3 ? Hl.width - 2 : Hl.width;
  const inside = (x, y) => { const h = half(y); return h >= 0 && Math.abs(x - cx) <= h; };
  for (const t of tiles) if (inside(t.x, t.y)) setTile(t, "shipWall", { blocked: true });
  const interior = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!inside(x + dx, y + dy)) return false; return true; };
  const carve = (x, y, kind, extra) => { const t = at(x, y); if (t && interior(x, y)) setTile(t, kind, extra); return t; };
  const rooms = [], rect = (x0, y0, w, h, kind, extra, role) => { const i = rooms.length; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) carve(x, y, kind, { room: i, ...extra }); const q = { x: x0 + (w >> 1), y: y0 + (h >> 1), x0, y0, w, h, i, role }; rooms.push(q); return q; };
  // the spine: bow to stern, its middle stretch a glass walk over the stars
  const sy0 = Hl.bow + 6, sy1 = Hl.stern - 2, g0 = Math.round(sy0 + (sy1 - sy0) * R.glassSpine[0]), g1 = Math.round(sy0 + (sy1 - sy0) * R.glassSpine[1]);
  for (let y = sy0; y <= sy1; y++) for (let dx = -1; dx <= 1; dx++) carve(cx + dx, y, y >= g0 && y <= g1 ? "shipGlass" : "shipGrate", { spine: true });
  // the engine hall at the stern (the way in), the bridge at the bow (the heart)
  const engine = rect(cx - 5, Hl.stern - 7, 11, 6, "shipDeck", { engine: true }, "entry");
  const bridge = rect(cx - 7, Hl.bow + 3, 15, 7, "shipDeck", { bridgeDeck: true }, "heart");
  // the promenades: along the hull on both sides, under the windows, joined to the spine at the bow and the stern
  const py0 = Hl.bow + Hl.taper, py1 = Hl.stern - 5;
  for (const side of [-1, 1]) { for (let y = py0; y <= py1; y++) for (const o of P) carve(cx + side * o, y, "shipGrate", { promenade: true });
    for (const yy of [py0, py0 + 1, py1 - 1, py1]) for (let x = 2; x < P[0]; x++) { const t = at(cx + side * x, yy); if (t?.blocked) carve(cx + side * x, yy, "shipGrate", { promenade: true }); } }
  // rooms between the spine and the promenades, a door onto each; one open bay (the hangar) open to space, crossed on catwalks
  const hangarAt = R.hangar ? Math.floor(r() * 3) : -1; let row = 0;
  for (let y = py0 + 3; y + 4 < py1 - 1; y += R.roomEvery, row++) for (const side of [-1, 1]) {
    if (r() < R.roomSkip) continue;
    const hangar = row === hangarAt && side === 1, w = hangar ? P[0] - 3 : span(r, R.room.w), h = span(r, R.room.h), x0 = side < 0 ? cx - 2 - w : cx + 3, y0 = y + span(r, [0, Math.max(0, R.roomEvery - h - 1)]), dy = y0 + (h >> 1);
    const glass = !hangar && r() < R.observatory;
    const q = rect(x0, y0, w, h, hangar ? "abyss" : glass ? "shipGlass" : "shipDeck", hangar ? { environment: "abyss", chasm: true, hangar: true } : glass ? { observatory: true } : {}, hangar ? "hangar" : glass ? "observatory" : "room");
    for (const yy of [dy, dy + 1]) carve(side < 0 ? x0 + w : x0 - 1, yy, "shipDeck", { door: true }); // onto the spine
    for (let x = side < 0 ? x0 - 1 : x0 + w; side < 0 ? x > cx - P[0] : x < cx + P[0]; x += side) for (const yy of [dy, dy + 1]) { const t = at(x, yy); if (t?.blocked) carve(x, yy, "shipDeck", { door: true }); } // and out to the promenade
    if (hangar) { // the bay: the hull opened beside it, the promenade a catwalk through it, a catwalk across its middle
      for (let yy = y0; yy < y0 + h; yy++) for (let x = cx + P[0]; x < W; x++) { const t = at(x, yy); if (t && inside(x, yy)) setTile(t, "abyss", { environment: "abyss", chasm: true, room: q.i, hangar: true }); }
      for (let yy = y0; yy < y0 + h; yy++) for (const o of P) setTile(at(cx + o, yy), "shipCatwalk", { room: q.i, catwalk: true, bridgeAxis: "y" });
      for (let x = x0; x < cx + P[0]; x++) for (const yy of [dy, dy + 1]) carve(x, yy, "shipCatwalk", { room: q.i, catwalk: true, bridgeAxis: "x" });
    }
  }
  // windows: hull beside a deck, here and there, looking out
  for (const t of tiles) if (t.kind === "shipWall" && N4.some(([dx, dy]) => !inside(t.x + dx, t.y + dy))) t.hull = true;
  for (const t of tiles) if (t.hull && N4.some(([dx, dy]) => walk(at(t.x + dx, t.y + dy))) && (hashSeed(`${id}:win:${t.x},${t.y}`) % 1000) / 1000 < R.windowShare) setTile(t, "shipStarWindow", { blocked: true, window: true, hull: true });
  const map = { width: W, height: H, tiles, entry: { x: engine.x, y: engine.y } };
  return { map, r, rooms };
}

// Lays realm `id` (a v1 id). Returns a dungeon map: tiles, entry, objects (realmObject: exit, crystal, cache, seed, beacon,
// lore) and creature spawns (one seedRealmHeart). The same id always lays the same realm.
export function generateSeedRealm(seed, id) {
  const p = parseSeedRealmId(id);
  if (!p || !seedRealmVersionKnown(p.v)) return null;
  const R = SEED_REALMS[p.realm], built = p.realm === "husk" ? generateHusk(seed, id, p) : generateShip(seed, id, p), { map, rooms, r } = built, W = map.width, H = map.height, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : map.tiles[y * W + x]);
  const objects = [], spawns = [], taken = new Set(), key = (t) => t.y * W + t.x;
  const seen = realmReach(map), sound = (t) => walk(t) && seen[key(t)] && !taken.has(key(t)) && !t.door;
  // The nearest tile to (x, y) that `ok` allows, searched ring by ring outward (ties: the first in row order).
  const near = (x, y, ok = sound) => { x = Math.round(x); y = Math.round(y); let best = null, bd = Infinity;
    for (let rr = 0; rr < Math.max(W, H) && rr <= bd + 1; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx += (Math.abs(dy) === rr ? 1 : 2 * rr || 1)) {
      const t = at(x + dx, y + dy); if (!t || !ok(t)) continue; const d = Math.hypot(dx, dy); if (d < bd || (d === bd && (t.y < best.y || (t.y === best.y && t.x < best.x)))) { bd = d; best = t; } }
    return best; };
  const place = (t, o) => { if (!t) return null; taken.add(key(t)); for (const [dx, dy] of N4) { const q = at(t.x + dx, t.y + dy); if (q) taken.add(key(q)); } const q = { ...o, x: t.x, y: t.y }; objects.push(q); return q; };
  const byRoom = new Map(); for (const t of map.tiles) { const i = built.islands ? t.isle : t.room; if (i !== undefined && walk(t)) { if (!byRoom.has(i)) byRoom.set(i, []); byRoom.get(i).push(t); } }
  const pickIn = (room, salt) => { const pool = (byRoom.get(room.i) || []).filter(sound); return pool.length ? pool[hashSeed(`${id}:${salt}`) % pool.length] : null; };
  const entryRoom = rooms.find((q) => q.role === "entry"), heart = rooms.find((q) => q.role === "heart");
  const entry = near(map.entry.x, map.entry.y); map.entry = { x: entry.x, y: entry.y }; taken.add(key(entry));
  // the way back out, by the way in, and the way onward at the heart (dark until it falls)
  place(near(entry.x, entry.y + 2), { id: "realm-rift", kind: "realmExit", realmObject: "exit", name: "Fading Rift", state: "open", actions: ["leave"], actionLabels: { leave: SEED_REALMS.text.rift } });
  const boss = near(heart.x, heart.y); taken.add(key(boss));
  spawns.push({ id: `${id}:heart`, kind: R.heart, x: boss.x, y: boss.y, boss: true, seedRealmHeart: true, dungeonRole: "seedRealmHeart", traits: ["vital"] });
  place(near(heart.x, heart.y + 3), { id: "realm-onward", kind: "realmExit", realmObject: "exit", onward: true, name: "Way Onward", state: "sealed", actions: ["leave"], actionLabels: { leave: SEED_REALMS.text.onward } });
  // the beacon: in the room about half way (by walking distance) from the way in to the heart
  const flood = (from) => { const d = new Int32Array(map.tiles.length).fill(-1), q = [key(from)]; d[q[0]] = 0; for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0; for (const [dx, dy] of N4) { const t = at(x + dx, y + dy); if (t && walk(t) && d[key(t)] < 0) { d[key(t)] = d[k] + 1; q.push(key(t)); } } } return d; };
  const dist = flood(entry), toHeart = flood(boss), mark = (q) => key(near(q.x, q.y, walk));
  const others = rooms.filter((q) => q !== entryRoom && q !== heart && q.role !== "hangar" && dist[mark(q)] > 0), even = (q) => Math.abs(dist[mark(q)] - toHeart[mark(q)]);
  const mid = others.slice().sort((a, b) => even(a) - even(b) || a.i - b.i)[0]; // as far from the way in as from the heart
  const bt = mid && pickIn(mid, "beacon"); if (bt) { const rise = near(bt.x, bt.y + 1, (t) => walk(t) && seen[key(t)] && t !== bt); place(bt, { id: "realm-beacon", kind: "realmBeacon", realmObject: "beacon", name: "Realm Beacon", state: "dark", actions: ["kindle"], actionLabels: { kindle: "Kindle the beacon (rise here if you fall)" }, rise: { x: rise.x, y: rise.y } }); }
  // rewards, far rooms first (the farther from the way in, the likelier)
  const order = others.filter((q) => q !== mid).map((q) => ({ q, d: dist[mark(q)] + (hashSeed(`${id}:room-order:${q.i}`) % 9) })).sort((a, b) => b.d - a.d || a.q.i - b.q.i).map((x) => x.q);
  const hangar = rooms.find((q) => q.role === "hangar"), spread = hangar ? [hangar, ...order] : order;
  const crystals = span(r, R.crystals), caches = span(r, R.caches);
  for (let i = 0; i < crystals && spread.length; i++) place(pickIn(spread[i % spread.length], `crystal${i}`), { id: `realm-crystal-${i}`, kind: "realmCrystal", realmObject: "crystal", name: "Aperture Crystal", state: "ready", actions: ["attune"], actionLabels: { attune: `Attune (Aperture +${SEED_REALMS.crystal.aperture})` } });
  for (let i = 0; i < caches && order.length; i++) place(pickIn(order[(i * 2 + 1) % order.length], `cache${i}`), { id: `realm-cache-${i}`, kind: "realmCache", realmObject: "cache", name: p.realm === "ship" ? "Supply Locker" : "Ore Cart", state: "closed", actions: ["open"], actionLabels: { open: "Open" } });
  const seedKind = realmSeedRoll(id); if (seedKind && order.length) place(pickIn(order[0], "seed"), { id: "realm-seed", kind: "realmSeed", realmObject: "seed", seed: seedKind, name: "A seed", state: "waiting", actions: ["take"], actionLabels: { take: "Pick it up" } });
  const lines = SEED_REALMS.lore[p.realm]; for (let i = 0; i < R.lore && order.length; i++) { const room = order[(i * 3 + 2) % order.length], line = lines[(hashSeed(`${id}:lore`) + i) % lines.length]; place(pickIn(room, `lore${i}`), { id: `realm-lore-${i}`, kind: "realmLore", realmObject: "lore", name: p.realm === "ship" ? "Cracked Panel" : "Scratched Stone", lore: line, state: "quiet", actions: ["read"], actionLabels: { read: "Read" } }); }
  // the creatures: some in every room but the way in, and knots of wisps in the husk
  const dweller = (q, k) => { const t = pickIn(q, `spawn${k}`); if (!t || Math.hypot(t.x - entry.x, t.y - entry.y) < SEED_REALMS.minFromEntry) return null; taken.add(key(t)); return t; };
  let k = 0; const per = R.perIsland || R.perRoom;
  for (const q of rooms) { if (q === entryRoom || q === heart) continue; for (let n = span(r, per); n > 0 && spawns.length < SEED_REALMS.maxSpawns; n--, k++) { const t = dweller(q, k); if (t) spawns.push({ id: `${id}:s${k}`, kind: pickWeighted(R.kinds, hashSeed(`${id}:kind:${k}`)), x: t.x, y: t.y, traits: hashSeed(`${id}:trait:${k}`) % 6 === 0 ? ["keen"] : [] }); } }
  if (R.knots) for (let n = span(r, R.knots), j = 0; j < n && order.length; j++) { const q = order[(j * 2) % order.length]; for (let w = 0; w < R.knot && spawns.length < SEED_REALMS.maxSpawns; w++, k++) { const t = dweller(q, k); if (t) spawns.push({ id: `${id}:w${k}`, kind: "gloomwisp", x: t.x, y: t.y, haunt: "realm", traits: [] }); } }
  const T = SEED_REALMS.threat; for (const s of spawns) s.realmThreat = { hp: T.hp, damage: T.damage };
  Object.assign(map, {
    seed, id, recipe: "seedRealm", name: R.name, identity: R.label, danger: p.realm === "ship" ? "robots and open space" : "the drop, and the dead", objects, enemySpawns: spawns,
    seedRealm: { v: p.v, kind: p.kind, realm: p.realm, n: p.n }, activeEnemyCap: SEED_REALMS.activeCap,
  });
  annotateDungeon(map, { classification: "seed-realm", generatorVersion: p.v, sizeProfile: "deep" });
  map.arena = true; // after the contract (discovery stays on): no crossing dressings (bells, pages, merchants, hordes, traps, chasm carving)
  return map;
}
// A realm this release cannot lay (an unknown version): a small dark landing with only the Fading Rift, so whatever asks for
// the map gets a sound one. A save is never left inside one (ensureSeedRealmSession); this is the last line of defence.
export function seedRealmFallback(id) {
  const W = 9, tiles = []; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const edge = x === 0 || y === 0 || x === W - 1 || y === W - 1; tiles.push({ x, y, kind: edge ? "abyss" : "huskFloor", blocked: false, ...(edge ? { environment: "abyss", chasm: true } : {}), realm: "husk", detail: 0 }); }
  return { id, recipe: "seedRealm", name: "A Fading Realm", width: W, height: W, tiles, entry: { x: 4, y: 4 }, objects: [{ id: "realm-rift", kind: "realmExit", realmObject: "exit", name: "Fading Rift", state: "open", actions: ["leave"], actionLabels: { leave: SEED_REALMS.text.rift }, x: 4, y: 6 }], enemySpawns: [], seedRealm: { v: 0, kind: null, realm: "husk", n: 0 }, activeEnemyCap: 1, arena: true };
}
// The map's identity for version pinning (tests): a short hash of its tiles, objects and spawns.
export function seedRealmFingerprint(map) {
  return hashSeed(JSON.stringify([map.width, map.height, map.entry, map.tiles, map.objects, map.enemySpawns])).toString(36);
}
// A small minimap colour (seed-realm-render and the Atlas may use it).
export const SEED_REALM_COLORS = { husk: "#8a7f72", ship: "#9fb4c8" };
