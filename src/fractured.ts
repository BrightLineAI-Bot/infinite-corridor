// Fractured mode (release 651; Tim, 2026-11-01: "a fractured mode that you can toggle on and off... more like Diablo... the
// tiles always have monsters... 2 to 3 times as many... they come in waves... you're not gonna really feel safe until you get
// to town, or until you've defeated the Guardian"; then "Diablo 3 might have been a little bit frenetic... Diablo 2... shares
// more DNA with our game"; and, on the plan drawn from Diablo II and III, Path of Exile 1 and 2 and Remnant: build both paces).
//
// A per-journey setting (save.fractured: null | "fractured" | "frenzied", chosen in Options → Challenge). While it is on:
// - Density (Diablo II / Path of Exile packs): every ordinary section and dungeon level gains `density`× its creatures, laid
//   out as packs round the creatures already there: plain packs, champion packs (one shared trait, `CHAMPION`) and now and
//   then a rare leader (two or three traits, `RARE`) with an escort. Placement is hashed from the area, so it is the same each
//   visit.
// - Reinforcements (Diablo III rifts, Remnant spawners): every `every` s a pack comes in from just out of sight
//   (`spawnDistance`), every `surgeEvery`th a bigger surge with a champion at its head, never past `cap` creatures alive.
// - Rest (Diablo II, Remnant): towns, hamlets, home, the Refuge lands, Skylands and sealed or cleared dungeons are safe; a
//   doorway gives `grace` s; clear everything within `sight` and the next pack waits `lull` s.
// - Return (Remnant's checkpoint rest): an area left for `repopulate` s fills up again; its guardians, bosses, hunts and
//   one-time foes stay dead.
// - Loot: reinforcements drop an item only `trashDrop` of the time (auto-picked up and salvaged as always); champions and
//   rares drop more and give more experience.
// Bounded: one reinforcement roll a frame at most, a fixed number of tile checks per spawn, the live cap.
import { hashSeed } from "./random.ts";

export const FRACTURED = {
  modes: {
    fractured: { name: "Fractured", text: "Diablo II pace: twice the creatures, in packs with champions and rares; a pack comes every 30–45 s.", density: 2, every: [30, 45], pack: [3, 5], surgeEvery: 4, surge: 2, cap: 18, lull: 90, champion: .28, rare: .12 },
    frenzied: { name: "Frenzied", text: "Diablo III pace: two and a half times the creatures; packs every 12–20 s.", density: 2.5, every: [12, 20], pack: [4, 6], surgeEvery: 3, surge: 3, cap: 24, lull: 40, champion: .32, rare: .15 },
  },
  grace: 20, // s of quiet after any doorway
  repopulate: 90, // s away before an area fills up again
  sight: 11, // tiles: "clear what is in sight"
  spawnDistance: [10, 15], // tiles from the Wayfarer: just off the screen
  near: 2, // tiles: how far a pack spreads round its anchor
  trashDrop: .25, // a reinforcement's chance of an item
  fallback: ["ashling", "glassMite", "ashenHound", "coilStalker", "rootBrute"], // when an area has no creatures of its own to copy
  traits: ["plated", "feral", "swift", "farcasting", "vital", "keen"],
  messages: { arrive: "Something tears through the fracture nearby.", surge: "The fracture splits wide: a surge is coming.", lull: "The fracture quiets for a while.", rare: "A rare creature leads this pack." },
};
export const CHAMPION = { hp: 1.8, damage: 1.2, scale: 1.12, xp: 2, drops: 1 }; // one shared trait for the whole pack
export const RARE = { hp: 3.2, damage: 1.35, scale: 1.3, xp: 4, drops: 2, traits: [2, 3] }; // the leader; its escort is plain
const NAME_A = ["Gloom", "Ash", "Hollow", "Grim", "Pale", "Rot", "Shard", "Blight", "Dread", "Cinder", "Thorn", "Vile"];
const NAME_B = ["maw", "spine", "hide", "fang", "husk", "brand", "gut", "eye", "claw", "wretch", "skull", "veil"];

export function fracturedMode(save) { const m = save?.fractured; return m && FRACTURED.modes[m] ? { id: m, ...FRACTURED.modes[m] } : null; }
export function normalizeFractured(save) { if (save && !FRACTURED.modes[save.fractured]) save.fractured = null; return save; }
const pick = (n, [lo, hi]) => lo + n % (hi - lo + 1);
export function rareName(seed, id) { const h = hashSeed(`${seed}:rare-name:${id}`); return `${NAME_A[h % NAME_A.length]}${NAME_B[(h >>> 8) % NAME_B.length]}`; }

// A pack's members as spawn records round (ax, ay). `rank` is null, "champion" or "rare"; `open(x, y)` says whether a tile can
// take a creature. Ids are `${prefix}-${k}`, so a pack laid from the same key is the same pack.
export function packSpawns(key, kinds, ax, ay, size, rank, open, prefix, extra = {}) {
  const out = [], taken = new Set(), h = (k) => hashSeed(`${key}:${k}`), kind = kinds[h("kind") % kinds.length], T = FRACTURED.traits;
  const shared = rank === "champion" ? [T[h("trait") % T.length]] : [];
  for (let i = 0; i < size * 4 && out.length < size; i++) {
    const r = FRACTURED.near, x = Math.round(ax) + (h(`x${i}`) % (r * 2 + 1)) - r, y = Math.round(ay) + (h(`y${i}`) % (r * 2 + 1)) - r;
    if (taken.has(`${x},${y}`) || !open(x, y)) continue; taken.add(`${x},${y}`);
    const lead = rank === "rare" && out.length === 0, traits = lead ? [...T].sort((a, b) => h(`t${a}`) - h(`t${b}`)).slice(0, pick(h("n"), RARE.traits)) : shared;
    out.push({ id: `${prefix}-${out.length}`, kind, x, y, traits, fractured: true, ...(rank === "champion" ? { fracRank: "champion" } : lead ? { fracRank: "rare" } : {}), ...extra });
  }
  return out;
}

// The packs an area gains on arrival: (density − 1) × its creatures (`count`), round its ordinary creatures' places (or, with none, round open
// floor), each pack plain, champion or with a rare leader by a hash of the area.
export function densityPacks(seed, areaId, mode, base, openTiles, open, count = base.length) {
  const want = Math.round(Math.max(count, 4) * (mode.density - 1)), out = [], kinds = base.length ? [...new Set(base.map((q) => q.kind))] : FRACTURED.fallback;
  const anchors = base.length ? base : openTiles;
  for (let p = 0; out.length < want && p < want * 2; p++) {
    const key = `${seed}:fractured:v1:${areaId}:pack${p}`, h = hashSeed(key), a = anchors[h % anchors.length]; if (!a) break;
    const roll = ((h >>> 9) % 1000) / 1000, rank = roll < mode.rare ? "rare" : roll < mode.rare + mode.champion ? "champion" : null;
    out.push(...packSpawns(key, kinds, a.x, a.y, Math.min(want - out.length, pick(h >>> 3, mode.pack)), rank, (x, y) => open(x, y) && !out.some((q) => q.x === x && q.y === y), `frac-${areaId}-p${p}`));
  }
  return out;
}

// Champions and rares: tougher, bigger, worth more. Applied to a combatant made from a fractured spawn.
export const rankXp = (e) => e?.fracRank === "rare" ? RARE.xp : e?.fracRank === "champion" ? CHAMPION.xp : 1; // on top of the section's own multiplier
export function applyFracturedRank(c, spawn, seed) {
  const R = spawn.fracRank === "rare" ? RARE : spawn.fracRank === "champion" ? CHAMPION : null; c.fractured = true; if (spawn.fracReinforcement) c.fracReinforcement = true;
  if (!R) return c;
  c.fracRank = spawn.fracRank; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * R.hp)); c.damage = Math.max(1, Math.round(c.damage * R.damage)); c.scale = (c.scale || 1) * R.scale; c.bodyRadius = (c.bodyRadius || .38) * R.scale; c.staggerResistance = Math.max(c.staggerResistance || 0, spawn.fracRank === "rare" ? .5 : .25);
  if (spawn.fracRank === "rare") c.packName = rareName(seed, c.id);
  return c;
}
