// The Skylands (release 571; Tim, 2026-10-29: "since these are divine challenges... you should be able to... make the
// monster stronger... set the difficulty to be higher... and you get bigger rewards... if you complete any Skyland on base,
// it'll give you one of the items required to... increase the difficulty... each Skyland gives you... enough to do...
// another Skyland on that tier... if you do tier 2... you get 2 rewards... farm harder and harder challenges... it should be
// repeatable... I would love to be able to just spend a bunch of time doing like boss rush").
//
// A Sky Stair stands in some wild sections (one candidate per `macro`×`macro` block of sections, past `minDepth`, only in
// sections first seen from this release on). Climbing it starts a Skyland: a floating arena where three waves come in turn
// (a pack, then hardened elites, then a boss), every foe made stronger by the chosen Ascension tier (`hpPerTier`,
// `damagePerTier`). Ascension N costs N Ascension Sigils (tier 0 is free) and may be chosen up to one above the highest tier
// cleared. Clearing tier N gives back max(1, N) sigils (so tier 0 earns the first one, a tier repays itself, and the climb is
// farmed from the tiers below), marks (`marks` + `marksPerTier`·N) and N spheres. Any Sky Stair can be climbed again, as
// often as you like. save.skylands = { sigils, best, runs, clears } (additive at schema 14; normalised here and in types.ts).
// Pure rules: game.ts runs the waves and main.ts labels the tiers.
import { hashSeed } from "./random.js?v=r571-8dbd44d5d7fb";

export const SKYLANDS = {
  version: 1, macro: 8, chance: .65, minDepth: 14, maxTier: 20, hpPerTier: .6, damagePerTier: .25,
  marks: 120, marksPerTier: 120, waveGap: 1.6,
  waves: [
    { count: 5, kinds: ["rootBrute", "sparkWarden", "coilStalker", "ashenHound", "glassMite", "veilMoth"], traits: [] },
    { count: 3, kinds: ["hollowMarshal", "voidSentinel", "rootBrute", "sparkWarden"], traits: ["vital", "plated", "swift"] },
    { count: 1, boss: true, traits: ["vital"] },
  ],
};
const n0 = (v) => Math.max(0, Math.floor(Number(v) || 0));
export function ensureSkylands(save) {
  const q = save.skylands && typeof save.skylands === "object" && !Array.isArray(save.skylands) ? save.skylands : (save.skylands = {});
  return Object.assign(q, { sigils: n0(q.sigils), best: Number.isInteger(q.best) && q.best >= 0 ? Math.min(SKYLANDS.maxTier, q.best) : -1, runs: n0(q.runs), clears: n0(q.clears) }); // in place: holders of it stay current
}
// Is there a Sky Stair in this section? One candidate per macro block, kept with `chance`.
export function skylandSection(seed, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < SKYLANDS.minDepth) return false;
  const M = SKYLANDS.macro, mx = Math.floor(rx / M), my = Math.floor(ry / M), h = hashSeed(`${seed}:skyland:v1:${mx}:${my}`);
  if ((h % 1000) / 1000 >= SKYLANDS.chance) return false;
  return mx * M + ((h >>> 10) % M) === rx && my * M + ((h >>> 16) % M) === ry;
}
// The tiers a Sky Stair offers now: 0 up to one above the best cleared, each affordable with the sigils held.
export function skylandTiers(save) {
  const s = ensureSkylands(save), top = Math.min(SKYLANDS.maxTier, s.best + 1), out = [];
  for (let t = 0; t <= top; t++) if (t <= s.sigils) out.push(t);
  return out;
}
export const skylandActions = (save) => skylandTiers(save).map((t) => `ascend:${t}`);
export function skylandLabel(action, save) {
  const m = /^ascend:(\d+)$/.exec(String(action)); if (!m) return null; const t = Number(m[1]), s = ensureSkylands(save);
  return t === 0 ? "Climb the stair (Ascension 0)" : `Ascension ${t} · ${t} sigil${t > 1 ? "s" : ""} (you hold ${s.sigils})`;
}
export const isSkyland = (id) => String(id || "").startsWith("skyland:");
export const skylandTierOf = (id) => { const m = /:t(\d+):r\d+$/.exec(String(id)); return m ? Number(m[1]) : 0; };
// Spend the sigils and name the run. Returns { ok, id, tier, message }.
export function beginSkyland(save, at, tier) {
  const s = ensureSkylands(save), t = n0(tier);
  if (!skylandTiers(save).includes(t)) return { ok: false, message: t > s.best + 1 ? `Ascension ${t} opens once Ascension ${t - 1} is cleared.` : `Ascension ${t} needs ${t} Ascension Sigils; you hold ${s.sigils}.` };
  s.sigils -= t; s.runs++;
  return { ok: true, id: `skyland:${save.seed}:${at.rx},${at.ry}:t${t}:r${s.runs}`, tier: t, message: t ? `The stair climbs into a sky that pushes back. Ascension ${t}: everything here is stronger.` : "The stair climbs into open sky. Something waits on the islands above." };
}
export function skylandScale(tier) { return { hp: 1 + SKYLANDS.hpPerTier * tier, damage: 1 + SKYLANDS.damagePerTier * tier }; }
// The spawns of wave `wave` (0-based) of run `id`, around `centre` on `open` tiles; the last wave is `bossKind`.
export function skylandWave(id, wave, open, centre, bossKind) {
  const W = SKYLANDS.waves[wave]; if (!W || !open.length) return [];
  const near = open.filter((q) => Math.hypot(q.x - centre.x, q.y - centre.y) <= 6).sort((a, b) => hashSeed(`${id}:w${wave}:${a.x},${a.y}`) - hashSeed(`${id}:w${wave}:${b.x},${b.y}`));
  const pool = near.length >= W.count ? near : open;
  return Array.from({ length: W.count }, (_, i) => { const at = pool[i % pool.length], h = hashSeed(`${id}:w${wave}:kind:${i}`);
    return { id: `${id}:w${wave}:${i}`, kind: W.boss ? bossKind : W.kinds[h % W.kinds.length], x: at.x, y: at.y, traits: [...W.traits], skyWave: wave, dungeonRole: "skyland", ...(W.boss ? { boss: true } : {}) }; });
}
// Clearing tier N: sigils back, marks and spheres. Returns the rewards given.
export function completeSkyland(save, tier) {
  const s = ensureSkylands(save), t = n0(tier), sigils = Math.max(1, t), marks = SKYLANDS.marks + SKYLANDS.marksPerTier * t;
  s.sigils += sigils; s.best = Math.max(s.best, t); s.clears++;
  save.currency = (Number(save.currency) || 0) + marks; save.materials ||= {};
  const spheres = { weaponSphere: Math.ceil(t / 2), armorSphere: Math.floor(t / 2) };
  for (const [k, v] of Object.entries(spheres)) if (v) save.materials[k] = (Number(save.materials[k]) || 0) + v;
  return { sigils, marks, ...spheres };
}
