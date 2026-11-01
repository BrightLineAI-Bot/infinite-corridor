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
// - Waves (Diablo III rifts, Remnant spawners; release 671): several packs come in together from just out of sight
//   (`spawnDistance`), every `surgeEvery`th wave all elite-led; clear a wave and the next waits `rest` s, or comes after `press`
//   s if it still stands; never past `cap` creatures brought by waves, nor `hardCap` alive in all.
// - Rest (Diablo II, Remnant): towns, hamlets, home, the Refuge lands, Skylands and sealed or cleared dungeons are safe; a
//   doorway gives `grace` s.
// - Return (Remnant's checkpoint rest): an area left for `repopulate` s fills up again; its guardians, bosses, hunts and
//   one-time foes stay dead.
// - Loot: reinforcements drop an item only `trashDrop` of the time (auto-picked up and salvaged as always); champions and
//   rares drop more and give more experience.
// Bounded: one reinforcement roll a frame at most, a fixed number of tile checks per spawn, the live cap.
import { hashSeed } from "./random.js?v=r684-436ff24739ec";
import { rollAffixes, SHAMAN } from "./affixes.js?v=r684-436ff24739ec";

export const FRACTURED = {
  modes: {
    // Release 671 (Tim, 2026-11-01, playing Frenzied: "the wave frequency is too slow... each wave... come in a little bit
    // quicker and... with more force... several packs coming in... I have to kill them all, and then you have to wait [about a
    // minute]. And then... several more packs come in, or I can go to the next square"): a wave is several packs (`packs`) from
    // different sides; clear it and the next waits `rest` s; leave it standing and another comes anyway after `press` s. Every
    // `surgeEvery`th wave is an elite wave: every pack in it led by a champion or a rare. `cap` counts only the creatures the
    // waves brought, so a crowded section still gets its waves; `hardCap` bounds everything alive (mobile).
    fractured: { name: "Fractured", text: "Diablo II pace: twice the creatures; waves of several packs, with champions and rares. Clear a wave and the next comes in about a minute.", density: 2, packs: [2, 3], pack: [3, 5], rest: 60, press: 45, surgeEvery: 3, surge: 1, cap: 24, hardCap: 54, champion: .28, rare: .12 },
    frenzied: { name: "Frenzied", text: "Diablo III pace: two and a half times the creatures; big waves of three to five packs. Clear a wave and the next comes in under a minute; stand your ground and they keep coming.", density: 2.5, packs: [3, 5], pack: [4, 6], rest: 45, press: 25, surgeEvery: 3, surge: 2, cap: 32, hardCap: 64, champion: .32, rare: .15 },
  },
  grace: 6, // s after any doorway before the first wave (release 671: was 20)
  repopulate: 90, // s away before an area fills up again
  sight: 11, // tiles: "clear what is in sight"
  spawnDistance: [10, 15], // tiles from the Wayfarer: just off the screen
  near: 2, // tiles: how far a pack spreads round its anchor
  trashDrop: .25, // a reinforcement's chance of an item
  corpse: 2, // s a fallen reinforcement lies before it is cleared away (never saved)
  maxAdded: 30, // at most this many creatures added to an area on arrival, however crowded
  fallback: ["ashling", "glassMite", "ashenHound", "coilStalker", "rootBrute"], // when an area has no creatures of its own to copy
  traits: ["plated", "feral", "swift", "farcasting", "vital", "keen"],
  messages: { arrive: "Something tears through the fracture nearby.", surge: "The fracture splits wide: a surge is coming.", lull: "The wave is broken. The fracture quiets for a while.", wave: "The fracture tears open: a wave is coming.", elite: "The fracture splits wide: elites lead this wave.", rare: "A rare creature leads this pack." },
};
export const CHAMPION = { hp: 1.8, damage: 1.2, scale: 1.12, xp: 2, drops: 1 }; // one shared trait for the whole pack
export const RARE = { hp: 3.2, damage: 1.35, scale: 1.3, xp: 4, drops: 2, traits: [2, 3] }; // the leader; its escort is plain
const NAME_A = ["Gloom", "Ash", "Hollow", "Grim", "Pale", "Rot", "Shard", "Blight", "Dread", "Cinder", "Thorn", "Vile"];
const NAME_B = ["maw", "spine", "hide", "fang", "husk", "brand", "gut", "eye", "claw", "wretch", "skull", "veil"];

export function fracturedMode(save) { const m = save?.fractured; return m && FRACTURED.modes[m] ? { id: m, ...FRACTURED.modes[m] } : null; }
export function normalizeFractured(save) { if (save && !FRACTURED.modes[save.fractured]) save.fractured = null; ensureFractureSeals(save); /* release 666 */ return save; }
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
  // Release 657 (affixes.ts): the pack's leader carries affixes (a champion one, a rare two) and an aura over the rest; now and
  // then a shaman stands apart, warding them.
  if (out.length && rank) { const lead = out[0]; lead.affixes = rollAffixes(key, rank === "rare" ? 2 : 1); for (const q of out.slice(1)) q.auraBy = lead.id; }
  if (out.length && (h("shaman") % 1000) / 1000 < SHAMAN.chance) {
    for (let i = 0; i < 16; i++) { const a = (h(`sa${i}`) % 628) / 100, r = SHAMAN.distance[0] + h(`sr${i}`) % (SHAMAN.distance[1] - SHAMAN.distance[0] + 1), x = Math.round(ax + Math.cos(a) * r), y = Math.round(ay + Math.sin(a) * r);
      if (taken.has(`${x},${y}`) || !open(x, y)) continue; const id = `${prefix}-shaman`; out.push({ id, kind: SHAMAN.kind, x, y, traits: [], fractured: true, fracShaman: true, ...extra }); for (const q of out) if (q.id !== id) q.wardBy = id; break; }
  }
  return out;
}

// The packs an area gains on arrival: (density − 1) × its creatures (`count`), round its ordinary creatures' places (or, with none, round open
// floor), each pack plain, champion or with a rare leader by a hash of the area.
export function densityPacks(seed, areaId, mode, base, openTiles, open, count = base.length) {
  const want = Math.min(FRACTURED.maxAdded, Math.round(Math.max(count, 4) * (mode.density - 1))), out = [], kinds = base.length ? [...new Set(base.map((q) => q.kind))] : FRACTURED.fallback;
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
  for (const k of ["affixes", "auraBy", "wardBy"]) if (spawn[k]) c[k] = Array.isArray(spawn[k]) ? [...spawn[k]] : spawn[k];
  if (spawn.fracShaman) { c.fracShaman = true; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * SHAMAN.hp)); c.speedMultiplier = (c.speedMultiplier || 1) * SHAMAN.speed; c.packName = "Shaman"; }
  if (!R) return c;
  c.fracRank = spawn.fracRank; c.maxHp = c.hp = Math.max(1, Math.round(c.maxHp * R.hp)); c.damage = Math.max(1, Math.round(c.damage * R.damage)); c.scale = (c.scale || 1) * R.scale; c.bodyRadius = (c.bodyRadius || .38) * R.scale; c.staggerResistance = Math.max(c.staggerResistance || 0, spawn.fracRank === "rare" ? .5 : .25);
  if (spawn.fracRank === "rare") c.packName = rareName(seed, c.id);
  return c;
}

// Release 666 (Tim, 2026-11-01): the fracture meter and the Fracture Warden. In a Fractured area every kill fills a meter
// (champions, rares and shamans count for more). Full, it tears open and a Fracture Warden steps through: a creature of the
// area's sort grown huge, with a mixed moveset, two affixes, aggressive pacing and packs it calls in during the fight, at
// `revenantShare` of a Gate Revenant's strength for the Wayfarer (tuneGatePredator), so it scales as they do. Felling it
// seals the area (`save.fractureSeals[key].sealed`): it is safe, reinforcements stop, and a cache drops (items through
// obtainDrop, auto-picked up and salvaged as always, plus marks and a draught).
export const FRACTURE_WARDEN = {
  kills: { fractured: 36, frenzied: 54 }, // the meter's size per mode
  worth: { champion: 2, rare: 3, shaman: 2 },
  revenantShare: .5, scale: 1.6, speed: 1.2, attackGap: .3, cooldownScale: .7, staggerResistance: .6, affixes: 2,
  spawnDistance: [5, 7], // tiles from the Wayfarer
  bodies: ["thunderhorn", "riftLynx", "mirrorShade", "sunderjaw", "amalgam"], // when the area has no pack creature of its own
  attacks: ["clawSweep", "ramCharge", "blinkStrike", "sigilScatter", "spikeVolley", "leapSlam", "sweepBeam", "groundRupture", "shockwave", "mortarVolley"],
  adds: { first: 6, every: [10, 14], size: [2, 3], cap: 8, championEvery: 3 }, // packs it calls in during the fight
  cache: { items: 3, marks: 40, draughts: 1 },
  maxRecords: 200, // seal records kept (the oldest unsealed meters go first)
  messages: {
    tear: "The fracture tears wide open. A Fracture Warden steps through.",
    call: "The Warden calls through the fracture.",
    sealed: "The fracture seals. This ground is quiet now.",
  },
};
export function fractureKey(area, stateId) { return `${area}:${stateId}`; }
// save.fractureSeals: { [key]: { kills, sealed } }, kept additive (unknown fields and records are kept; nonsense cleaned).
export function ensureFractureSeals(save) {
  if (!save || save.fractureSeals === undefined) return save;
  const raw = save.fractureSeals && typeof save.fractureSeals === "object" && !Array.isArray(save.fractureSeals) ? save.fractureSeals : {}, out = {};
  for (const [k, v] of Object.entries(raw)) { if (!v || typeof v !== "object") continue; out[k] = { ...v, kills: Math.max(0, Math.floor(Number(v.kills) || 0)), sealed: v.sealed === true }; }
  save.fractureSeals = out; return save;
}
export function fractureRecord(save, key) {
  const all = (save.fractureSeals ||= {});
  if (!all[key]) {
    const keys = Object.keys(all); if (keys.length >= FRACTURE_WARDEN.maxRecords) { const drop = keys.find((k) => !all[k].sealed) || keys[0]; delete all[drop]; }
    all[key] = { kills: 0, sealed: false };
  }
  return all[key];
}
export function fractureSealed(save, key) { return save?.fractureSeals?.[key]?.sealed === true; }
export function fractureNeed(mode) { return FRACTURE_WARDEN.kills[mode?.id] || FRACTURE_WARDEN.kills.fractured; }
export function fractureWorth(e) { const W = FRACTURE_WARDEN.worth; return e?.fracShaman ? W.shaman : e?.fracRank === "rare" ? W.rare : e?.fracRank === "champion" ? W.champion : 1; }
// One kill toward the meter. Returns true when this kill filled it.
export function fractureKill(save, key, mode, e) {
  const r = fractureRecord(save, key); if (r.sealed) return false;
  const need = fractureNeed(mode), was = r.kills; r.kills = Math.min(need, r.kills + fractureWorth(e));
  return was < need && r.kills >= need;
}
export function wardenBody(seed, key, kinds, isPack) {
  const own = kinds.filter((k) => isPack(k)), pool = own.length ? own : FRACTURE_WARDEN.bodies;
  return pool[hashSeed(`${seed}:fracture-warden:${key}`) % pool.length];
}
export function wardenAttacks(seed, key) { const A = FRACTURE_WARDEN.attacks; return [...A].sort((a, b) => hashSeed(`${seed}:${key}:wa:${a}`) - hashSeed(`${seed}:${key}:wa:${b}`)).slice(0, 7); }
