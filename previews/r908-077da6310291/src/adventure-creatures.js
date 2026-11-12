// Adventure creatures, first set (Tim, 2026-11-11: "We can make new creatures... make these new creatures first. These creatures can
// take the vertical, more open-world type development into consideration when you're building them." Reskins are not wanted now).
//
// Two original creatures for each of the first three adventure themes, built for tall, open, interconnected ground:
//   tomb        Gallery Lurker (clings to a ledge or a wall, drops on you, climbs back), Censer Warden (lobs smoking pots from a gallery)
//   verdantRuin Vinehook Leaper (vaults between levels, hits and retreats up), Thornspitter Bloom (a rooted sniper; reaches farther from height)
//   ashWaste    Sinkmaw (lies buried in open sand, opens a funnel under you), Cinder Kite (flies a loop over the waste, strafes a lane of glass)
//
// This module is pure data and pure helpers: no save, no DOM, no randomness (every choice hashes stable ids). Their bodies, brains and
// attack modules are monster-pack entries (monster-pack.ts, `adventureKin`); the runners there read the tables below. They are
// `prototypeOnly`, so no crossing, dungeon, guardian pool, Echo list or hybrid roll ever draws them: only an adventure's theme table (a
// separate generator, keyed by ADVENTURE_CREATURES) or the Proving Ground places them. Each spawned one takes regional scaling through
// the one helper (Game.scaleToRegion), as every other creature does.
import { hashSeed } from "./random.js?v=r908-077da6310291";

export const ADVENTURE_CREATURE_VERSION = 1;

// The themes' rosters. `habitat` says where a spawn belongs (adventureSpawnSpot): `perch` high ground or a wall, `vantage` high ground
// with a view, `open` any open floor, `sand` flat open ground with room round it, `sky` open ground under open sky (it flies a loop over
// its home), `flat` level open ground with room round it (a patrol's streets, a frozen yard). `weight` is its share of a theme's picks; `pack` how many come together.
export const ADVENTURE_CREATURES = Object.freeze({
  tomb: Object.freeze([
    Object.freeze({ kind: "galleryLurker", role: "ambusher", habitat: "perch", weight: 3, pack: [1, 2] }),
    Object.freeze({ kind: "censerWarden", role: "ranged", habitat: "vantage", weight: 2, pack: [1, 1] }),
  ]),
  verdantRuin: Object.freeze([
    Object.freeze({ kind: "vinehookLeaper", role: "hunter", habitat: "open", weight: 3, pack: [1, 3] }),
    Object.freeze({ kind: "thornspitterBloom", role: "ranged", habitat: "vantage", weight: 2, pack: [1, 2] }),
  ]),
  ashWaste: Object.freeze([
    Object.freeze({ kind: "sinkmaw", role: "ambusher", habitat: "sand", weight: 2, pack: [1, 1] }),
    Object.freeze({ kind: "cinderKite", role: "patrol", habitat: "sky", weight: 3, pack: [1, 2] }),
  ]),
  // The second set (Tim, 2026-11-11: "creatures for the other four themes... so each theme has its own unique creatures"; no bosses).
  lamplitCity: Object.freeze([
    Object.freeze({ kind: "lamplighter", role: "patrol", habitat: "flat", weight: 3, pack: [1, 1] }),
    Object.freeze({ kind: "knellkeeper", role: "ranged", habitat: "vantage", weight: 2, pack: [1, 1] }),
  ]),
  alienCapital: Object.freeze([
    Object.freeze({ kind: "spindriftMedusa", role: "ranged", habitat: "sky", weight: 3, pack: [1, 2] }),
    Object.freeze({ kind: "prismStilt", role: "hunter", habitat: "vantage", weight: 2, pack: [1, 1] }),
  ]),
  frostCitadel: Object.freeze([
    Object.freeze({ kind: "rimeSentinel", role: "ranged", habitat: "vantage", weight: 2, pack: [1, 2] }),
    Object.freeze({ kind: "lakeGlider", role: "hunter", habitat: "flat", weight: 3, pack: [1, 2] }),
  ]),
  emberFoundry: Object.freeze([
    Object.freeze({ kind: "hookhanger", role: "ambusher", habitat: "perch", weight: 3, pack: [1, 2] }),
    Object.freeze({ kind: "slagwright", role: "ranged", habitat: "vantage", weight: 2, pack: [1, 1] }),
  ]),
});
export const ADVENTURE_THEME_IDS = Object.freeze(Object.keys(ADVENTURE_CREATURES));
export const ADVENTURE_KINDS = Object.freeze(ADVENTURE_THEME_IDS.flatMap((t) => ADVENTURE_CREATURES[t].map((q) => q.kind)));
export const ADVENTURE_THEME_OF = Object.freeze(Object.fromEntries(ADVENTURE_THEME_IDS.flatMap((t) => ADVENTURE_CREATURES[t].map((q) => [q.kind, t]))));
export const isAdventureKind = (kind) => Object.hasOwn(ADVENTURE_THEME_OF, kind);
// A theme's roster by its id, forgiving spelling ("verdant-ruin", "Verdant Ruin", "ash_waste" all resolve). Unknown themes: [].
const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const THEME_ALIASES = Object.freeze({ tomb: "tomb", cursedtomb: "tomb", verdantruin: "verdantRuin", verdant: "verdantRuin", jungle: "verdantRuin", ashwaste: "ashWaste", ash: "ashWaste", desert: "ashWaste",
  lamplitcity: "lamplitCity", city: "lamplitCity", aliencapital: "alienCapital", alien: "alienCapital", frostcitadel: "frostCitadel", frost: "frostCitadel", emberfoundry: "emberFoundry", foundry: "emberFoundry" });
export function adventureCreaturesFor(theme) { const id = THEME_ALIASES[squash(theme)]; return id ? ADVENTURE_CREATURES[id] : []; }
// A deterministic pick from a theme's roster for one spawn slot (`key` a stable id: the area and the slot).
export function pickAdventureCreature(theme, key) {
  const roster = adventureCreaturesFor(theme); if (!roster.length) return null;
  const total = roster.reduce((n, q) => n + q.weight, 0); let r = hashSeed(`adventure-creature:v${ADVENTURE_CREATURE_VERSION}:${theme}:${key}`) % total;
  for (const q of roster) { if (r < q.weight) return q; r -= q.weight; }
  return roster[0];
}

// ---------------------------------------------------------------- tuning (seconds, tiles, elevation levels)
// Every number the runners read. Damage multipliers ride on the creature's own damage (monster-pack stats), which regional scaling
// has already set; a height bonus is capped (`maxBonus`) so a long drop never one-shots.
export const ADV = Object.freeze({
  // Perches: the spots a Gallery Lurker climbs to (and a Leaper retreats to). Sampled on rings round the creature, never more than
  // `radii.length * dirs` floor tests a search, and searched again only every `rescan` seconds.
  perch: Object.freeze({ radii: Object.freeze([2, 3, 4.5]), dirs: 12, minRise: 1, rescan: 2.5, wait: 3.2, clingLift: .55, clingRise: 1, keep: [1.5, 5.5] }),
  // The leaps. `to`: "player" lands on the marked spot under the Wayfarer (tracked for `track` seconds of the windup, then locked);
  // "spot" lands on a perch. `arc` the hop's height (tiles of hopLift), `climbLift` more per level climbed. `perLevel`: damage bonus a
  // level dropped, up to `maxBonus`. `radius`: the landing's reach.
  leaps: Object.freeze({
    ledgeDrop: Object.freeze({ to: "player", track: .5, radius: 1.25, arc: .35, climbLift: 0, perLevel: .15, maxBonus: .45, damage: true, pose: "lean" }),
    ledgeClimb: Object.freeze({ to: "spot", arc: .7, climbLift: .35, damage: false, cling: true, pose: "coil", search: "perch" }),
    vineVault: Object.freeze({ to: "player", track: .4, radius: 1.15, arc: .9, climbLift: .45, perLevel: .08, maxBonus: .24, damage: true, pose: "crouch" }),
    vineRetreat: Object.freeze({ to: "spot", arc: 1, climbLift: .45, damage: false, cling: false, pose: "crouch", search: "retreat" }),
    phaseStep: Object.freeze({ to: "spot", arc: 0, climbLift: 0, damage: false, cling: false, pose: "blink", search: "retreat" }), // the Prism Stilt steps up a plate: no hop, a shimmer
  }),
  // The Leaper's retreat: high ground near the Wayfarer if there is any, else open ground `flat` tiles from them.
  retreat: Object.freeze({ radii: Object.freeze([3, 4.5]), dirs: 12, flat: [3, 5] }),
  // Height reach: a ranged attack reaches `per` tiles farther for each level its owner stands above the Wayfarer, up to `max`.
  reach: Object.freeze({ censerLob: Object.freeze({ per: 1, max: 3 }), thornDarts: Object.freeze({ per: 1.2, max: 3.6 }), lampFlare: Object.freeze({ per: 1, max: 3 }),
    bellToll: Object.freeze({ per: .8, max: 2.4 }), icicleLine: Object.freeze({ per: 1, max: 3 }), slagPour: Object.freeze({ per: 1, max: 3 }) }),
  // The Censer Warden's pots: one at the Wayfarer, one where they are going (`lead` seconds ahead). Each bursts after `arming` and
  // leaves smoke that slows (no damage) for `life` seconds.
  censer: Object.freeze({ lead: 1.1, arming: Object.freeze([1.05, 1.3]), radius: 1.05, smoke: Object.freeze({ radius: 1.15, life: 3, slow: .65 }) }),
  // The Thornspitter's darts: `count` in a fan `spread` radians apart, straight, stopped by walls; at most `cap` of one Bloom's alive.
  darts: Object.freeze({ count: 3, spread: .2, speed: 9, radius: .22, reach: 7.5, width: .28, cap: 6 }),
  // Home ground: a ranged keeper (vantage) walks back when it is `leash` tiles from where it was set.
  vantage: Object.freeze({ leash: 4.5 }),
  // The Sinkmaw: it lies buried until the Wayfarer is within `trigger` (sinkFunnel's range); the funnel pulls (`pull` tiles a second) within `radius` and
  // bites at its heart (`bite` past its body). Out of the sand, it buries itself again after `rebury` seconds with no attack, when the
  // Wayfarer is `clear` tiles off. It never opens a funnel under someone standing higher than it (`above` levels).
  sink: Object.freeze({ trigger: 2.9, radius: 3.4, pull: 2.4, bite: .9, rebury: 3.5, clear: 2.5, above: .25 }),
  // The Cinder Kite: a loop of `points` waypoints `radius` tiles round its home, flown at `speed` (of its pack speed); it gives up a
  // chase `leash` tiles from home. It rides `altitude` tiles of lift (`low` while strafing; eases at `ease` a second). The strafe:
  // a `lane` tiles long, `width` wide, dropping `shards` of hot glass that burst after `arming` (+ `step` each).
  kite: Object.freeze({ points: 6, radius: Object.freeze([3.5, 5.5]), speed: 1.6, near: .6, leash: 11, altitude: 1.3, low: .45, ease: 2.2,
    lane: 7, width: .7, shards: 4, shardRadius: .8, arming: .55, step: .14 }),
  // ---- the second set
  // The Lamplighter walks a loop of `points` waypoints `radius` round its home at `speed` (a waypoint reached within `arrive`); it is roused by the Wayfarer within `near`, or
  // within `sight` inside its lamp's cone (`cone` degrees either side of its heading, with a clear line). Its thrown lamp bursts like a
  // pot and leaves a burning patch (`fire`: radius, life, a bite every `tick` seconds of `bite` x its damage).
  lamp: Object.freeze({ points: 5, radius: Object.freeze([3, 4.5]), speed: .55, arrive: .5, near: 2, sight: 6.5, cone: 40, step: .6, arming: 1.05, radius2: 1, fire: Object.freeze({ radius: 1, life: 2.4, bite: .3, tick: .6 }) }),
  // The Knellkeeper's toll: `rings` rings `every` seconds apart rolling out to `radius` (+ height reach) over `life` seconds each.
  // A ring never touches ground higher than the bell (`above` levels): climb to it.
  toll: Object.freeze({ rings: 3, every: .45, radius: 4.2, life: .8, band: .5, above: .25 }),
  // The Spindrift Medusa: tendrils on `count` marks (the Wayfarer, `lead` seconds ahead, then round them `spread` tiles), each after
  // `arming` (+ `step`); its pulse hurts within `pulse` of it. It drifts at `altitude`, higher (by `perLevel` a level, up to `maxLift`)
  // when the Wayfarer stands above it.
  medusa: Object.freeze({ count: 3, lead: 1, spread: 1.6, arming: .85, step: .15, radius: .9, pulse: 2.1, altitude: .9, perLevel: .35, maxLift: 1.6, ease: 1.5 }),
  // The Rime Sentinel's icicles: `count` down a lane `reach` long (+ height reach), each after `arming` (+ `step`), each leaving a slick.
  icicles: Object.freeze({ count: 5, reach: 6.5, arming: .65, step: .12, radius: .75, width: .6, slick: Object.freeze({ radius: .9, life: 2.5, slow: .6 }) }),
  // The Lake Glider's rake: a lane `length` long, `width` wide, flown in `active` seconds; off a wall it rebounds `rebounds` times; it
  // leaves at most `slicks` slick patches (ADV.icicles.slick) along its run. `hit`: past its body.
  glide: Object.freeze({ length: 6.5, width: .6, rebounds: 1, slicks: 4, hit: .55 }),
  // The Hookhanger's pendulum: from its perch it swings `over` tiles past the Wayfarer along the marked lane, `arc` tiles high mid-swing.
  pendulum: Object.freeze({ over: 2, arc: .9, hit: .55, width: .8 }),
  // The Slagwright's pour: a pool `radius` wide after `arming`, burning (`tick` seconds a bite) for `life`; every `flowEvery` seconds it
  // runs on to a lower neighbouring floor, at most `steps` times (a level down, never up, never onto closed ground).
  slag: Object.freeze({ radius: .85, arming: .6, life: 3.5, tick: .6, flowEvery: .45, steps: 3 }),
});

// ---------------------------------------------------------------- helpers (pure; `w` is the pack world: open, elevation, tileOpen)
const TAU = Math.PI * 2;
export const levelAt = (w, q) => Number(w?.elevation?.(q.x, q.y)) || 0;
// How much farther a ranged attack reaches from `rise` levels above the Wayfarer.
export function heightReach(id, rise) { const R = ADV.reach[id]; return R ? Math.min(R.max, Math.max(0, Number(rise) || 0) * R.per) : 0; }
// The bonus a landing takes for `drop` levels fallen.
export function dropBonus(id, drop) { const C = ADV.leaps[id]; return C?.perLevel ? Math.min(C.maxBonus, Math.max(0, Number(drop) || 0) * C.perLevel) : 0; }
function wallBeside(w, x, y) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!w.open(x + dx, y + dy)) return true; return false; }
// A perch for `e` near the Wayfarer `p`: the open spot on its rings standing highest above the Wayfarer (at least `minRise`), nearest
// the Wayfarer's `keep` band; failing that (flat ground) a spot against a wall to cling to. Deterministic; at most radii x dirs tests.
export function findPerch(e, w, p) {
  const P = ADV.perch, base = levelAt(w, p), turn = (hashSeed(`${e.id}:perch`) % 12) * TAU / 12; let best = null, cling = null;
  for (const r of P.radii) for (let i = 0; i < P.dirs; i++) {
    const a = turn + i * TAU / P.dirs, q = { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r };
    if (!w.open(q.x, q.y)) continue;
    const rise = levelAt(w, q) - base, dp = Math.hypot(q.x - p.x, q.y - p.y), band = dp < P.keep[0] ? P.keep[0] - dp : dp > P.keep[1] ? dp - P.keep[1] : 0;
    if (rise >= P.minRise) { const score = rise * 10 - band; if (!best || score > best.score) best = { x: q.x, y: q.y, rise, score, cling: false }; }
    else if (!best && dp >= P.keep[0] && dp <= P.keep[1] && wallBeside(w, q.x, q.y)) { const score = -band - Math.abs(rise); if (!cling || score > cling.score) cling = { x: q.x, y: q.y, rise: P.clingRise, score, cling: true }; }
  }
  return best || cling;
}
// Where a Vinehook Leaper retreats to: high ground near the Wayfarer, else open ground a few tiles off. Deterministic, bounded.
export function findRetreat(e, w, p, seq = 0) {
  const R = ADV.retreat, base = levelAt(w, p), turn = (hashSeed(`${e.id}:retreat:${seq}`) % 12) * TAU / 12; let best = null;
  for (const r of R.radii) for (let i = 0; i < R.dirs; i++) {
    const a = turn + i * TAU / R.dirs, q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    if (!w.open(q.x, q.y)) continue;
    const rise = levelAt(w, q) - base, de = Math.hypot(q.x - e.x, q.y - e.y), score = Math.max(0, rise) * 10 - de * .2;
    if (rise < 0 && !(r >= R.flat[0] && r <= R.flat[1])) continue;
    if (!best || score > best.score) best = { x: q.x, y: q.y, rise, score, cling: false };
  }
  return best;
}
// The Cinder Kite's loop round `home`: `points` waypoints at alternating radii, the turning direction and start angle from its id.
// Points over closed ground are dropped; at least two are kept (else the loop is a lazy circle on its home).
export function kiteLoop(id, home, w) { return loopRoute(id, home, w, ADV.kite, "kite-loop"); }
// The Lamplighter's beat round its home (the same rule, its own numbers and hash).
export function lampLoop(id, home, w) { return loopRoute(id, home, w, ADV.lamp, "lamp-loop"); }
export function loopRoute(id, home, w, K, tag) {
  const h = hashSeed(`${id}:${tag}`), turn = (h % 628) / 100, dir = (h >>> 10) % 2 ? 1 : -1, out = [];
  for (let i = 0; i < K.points; i++) {
    const a = turn + dir * i * TAU / K.points, r = K.radius[(i + (h >>> 12)) % 2], q = { x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r };
    if (!w || w.open(q.x, q.y)) out.push({ x: Math.round(q.x * 100) / 100, y: Math.round(q.y * 100) / 100 });
  }
  return out.length >= 2 ? out : [{ x: home.x + 1, y: home.y }, { x: home.x - 1, y: home.y }];
}

// ---------------------------------------------------------------- placement
// Where one of these may be placed, for a generator (or the Proving Ground): `area` is { open(x, y), level(x, y), safe(x, y), width,
// height } (safe: no doorway, stairs, chest, object or lethal tile under it). Rings out from `near` (a stable order), testing at most
// `ADVENTURE_SPAWN.tests` spots, and returns the first spot that suits the kind's habitat, else null.
export const ADVENTURE_SPAWN = Object.freeze({ tests: 400, ring: [2, 12], room: 1, sandRoom: 2, perchRise: 1 });
export function adventureSpawnSpot(area, kind, near, used = []) {
  const theme = ADVENTURE_THEME_OF[kind]; if (!theme || !area) return null;
  const habitat = ADVENTURE_CREATURES[theme].find((q) => q.kind === kind).habitat, S = ADVENTURE_SPAWN, W = area.width || 32, H = area.height || 32;
  const ok = (x, y) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && area.open(x, y) && area.safe(x, y) && !used.some((q) => Math.hypot(q.x - x, q.y - y) < 2);
  const roomy = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!area.open(x + dx, y + dy) || area.level(x + dx, y + dy) !== area.level(x, y)) return false; return true; };
  const base = area.level(Math.round(near.x), Math.round(near.y)); let tests = 0, fallback = null;
  for (let r = S.ring[0]; r <= S.ring[1]; r++) for (let y = Math.round(near.y) - r; y <= Math.round(near.y) + r; y++) for (let x = Math.round(near.x) - r; x <= Math.round(near.x) + r; x++) {
    if (Math.max(Math.abs(x - Math.round(near.x)), Math.abs(y - Math.round(near.y))) !== r) continue;
    if (++tests > S.tests) return fallback;
    if (!ok(x, y)) continue;
    const rise = area.level(x, y) - base;
    if (habitat === "perch" || habitat === "vantage") { if (rise >= S.perchRise && roomy(x, y, 0)) return { x, y }; if (!fallback && habitat === "perch" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !area.open(x + dx, y + dy))) fallback = { x, y }; if (!fallback && habitat === "vantage" && roomy(x, y, S.room)) fallback = { x, y }; continue; }
    if (habitat === "sand" || habitat === "flat") { if (roomy(x, y, S.sandRoom)) return { x, y }; continue; }
    if (roomy(x, y, S.room)) return { x, y };
  }
  return fallback;
}
