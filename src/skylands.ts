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
//
// Release 585 (Tim, 2026-10-30: "vertical... platforms... floating in the air. And you can jump... from platform to platform
// ... to get to the skyway... each one is just a jump... pretty easily... a bunch of platforms... distributed... and things can
// walk under them, and you can't really get to the top platform unless you complete all the... steps... if you don't make it.
// You might die"): in sections first seen from now on (skyVersion 2) the Sky Stair becomes a skyway ascent: five (four or three
// where five will not fit: `SKYWAY.platforms`) square sky platforms (`size` tiles), each one level higher than the last and a `gap` of open ground away, winding through
// the section. The first stands one level up, so a jump reaches it; from a platform a jump keeps its height over the gap
// (game.ts, skyAir) and lands on the next. Creatures walk the ground beneath and cannot climb. A jump that ends over a gap
// falls (from four levels, fatally). The skyway door stands on the top platform and opens only from there.
import { hashSeed } from "./random.ts";

export const SKYLANDS = {
  version: 3, /* release 585: 2 = the stone skyway ascent; 587: 3 = floating discs */ macro: 8, chance: .65, minDepth: 14, maxTier: 20, hpPerTier: .6, damagePerTier: .25,
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
export const SKYWAY = { version: 2, platforms: [5, 4, 3], size: 2, gap: 1, area: [4, 27], clear: 1, tries: 120 }; // the most platforms that fit
const OPEN_GROUND = (t) => t && !t.blocked && !t.structure && !t.environment && !t.buildingId && !t.slope && !(t.elev > 0) && !/water|ocean|shallows|lava|void|abyss|canyon|river|mire|bog|pool/i.test(String(t.kind));
// Lays the ascent in `map` (32×32 tiles). Returns the top platform's door spot { x, y, elev } or null when no room was found.
export function buildSkyway(map, seed, rx, ry) {
  const S = SKYWAY, [lo, hi] = S.area, W = 32, at = (x, y) => map.tiles?.[y * W + x], step = S.size + S.gap, h = (k) => hashSeed(`${seed}:skyway:v1:${rx}:${ry}:${k}`);
  const ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1; // the exit causeways, edge to centre
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const free = (x, y) => x >= lo && y >= lo && x <= hi && y <= hi && OPEN_GROUND(at(x, y)) && !exitLine(x, y) && !(x >= 13 && x <= 19 && y >= 13 && y <= 19)
    && !(map.objects || []).some((o) => Math.hypot(o.x - x, o.y - y) < S.clear) && !(map.enemySpawns || []).some((o) => Math.hypot(o.x - x, o.y - y) < S.clear);
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const count of S.platforms) for (let t = 0; t < S.tries; t++) {
    const key = count === S.platforms[0] ? `${t}` : `${count}:${t}`, turnKey = (k) => count === S.platforms[0] ? `turn${t}:${k}` : `turn${count}:${t}:${k}`;
    let px = lo + h(`x${key}`) % (hi - lo), py = lo + h(`y${key}`) % (hi - lo), dir = h(`d${key}`) % 4; const pads = [], gaps = [];
    for (let k = 0; k < count; k++) {
      if (k) { const turn = h(turnKey(k)) % 3; dir = (dir + (turn === 0 ? 0 : turn === 1 ? 1 : 3)) % 4; const [dx, dy] = DIRS[dir];
        for (let g = 1; g <= S.gap; g++) for (let i = 0; i < S.size; i++) gaps.push(dx ? [px + (dx > 0 ? S.size - 1 + g : -g), py + i] : [px + i, py + (dy > 0 ? S.size - 1 + g : -g)]);
        px += dx * step; py += dy * step; }
      pads.push([px, py]);
    }
    const tiles = pads.flatMap(([x, y], k) => Array.from({ length: S.size * S.size }, (_, i) => [x + i % S.size, y + Math.floor(i / S.size), k]));
    const keys = new Set(tiles.map(([x, y]) => `${x},${y}`)); if (keys.size !== tiles.length || gaps.some(([x, y]) => keys.has(`${x},${y}`))) continue; // a path that crosses itself
    if (!tiles.every(([x, y]) => free(x, y)) || !gaps.every(([x, y]) => free(x, y))) continue;
    for (const [x, y, k] of tiles) { const i = y * W + x, was = map.tiles[i]; map.tiles[i] = { ...was, kind: "skyPlatform", elev: k + 1, slope: false, blocked: false, skyPlatform: true, landscape: was.landscape || "sky" }; }
    map.landscape ||= { version: 1, biome: null, name: null }; map.skyway = { pads: pads.map(([x, y], k) => ({ x, y, elev: k + 1 })) };
    const [tx, ty] = pads[pads.length - 1]; return { x: tx, y: ty, elev: count };
  }
  return null;
}
// Release 587 (Tim: "the skyline platforms should be round discs that you can jump on that are floating in the air"; the raised
// stone platforms stay for sections pinned to skyVersion 2): from skyVersion 3 the ascent is a chain of `SKY_DISCS.count` round
// discs floating over open ground, each one level higher, `spacing` tiles apart centre to centre. The ground under them is left as
// it is, so creatures walk beneath. The discs are a layer of their own: game.ts keeps the Wayfarer's `skyLevel`; a jump that
// ends over a disc no more than one level above where it began lands on it, walking off a disc falls (four levels: fatal).
export const SKY_DISCS = { count: [5, 4, 3], radius: 1.15, spacing: 2.6, area: [4, 27], clear: 1, tries: 120, bob: .06 };
export function buildSkyDiscs(map, seed, rx, ry) {
  const D = SKY_DISCS, [lo, hi] = D.area, W = 32, at = (x, y) => map.tiles?.[y * W + x], h = (k) => hashSeed(`${seed}:sky-discs:v1:${rx}:${ry}:${k}`);
  const ex = map.exits || {}, near = (c, v) => Number.isFinite(c) && Math.abs(v - c) <= 1;
  const exitLine = (x, y) => (near(ex.north, x) && y <= 16) || (near(ex.south, x) && y >= 16) || (near(ex.west, y) && x <= 16) || (near(ex.east, y) && x >= 16);
  const free = (x, y) => x >= lo && y >= lo && x <= hi && y <= hi && OPEN_GROUND(at(x, y)) && !exitLine(x, y) && !(x >= 13 && x <= 19 && y >= 13 && y <= 19)
    && !(map.objects || []).some((o) => Math.hypot(o.x - x, o.y - y) < D.clear) && !(map.enemySpawns || []).some((o) => Math.hypot(o.x - x, o.y - y) < D.clear);
  const under = (cx, cy) => { const out = []; for (let y = Math.floor(cy - D.radius); y <= Math.floor(cy + D.radius); y++) for (let x = Math.floor(cx - D.radius); x <= Math.floor(cx + D.radius); x++) if (Math.hypot(x + .5 - cx, y + .5 - cy) <= D.radius + .2) out.push([x, y]); return out; };
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (const count of D.count) for (let t = 0; t < D.tries; t++) {
    let cx = lo + 1.5 + h(`x${count}:${t}`) % (hi - lo - 2), cy = lo + 1.5 + h(`y${count}:${t}`) % (hi - lo - 2), dir = h(`d${count}:${t}`) % 8; const discs = [];
    for (let k = 0; k < count; k++) {
      if (k) { dir = (dir + [0, 1, 7, 2, 6][h(`turn${count}:${t}:${k}`) % 5]) % 8; const [dx, dy] = DIRS[dir], n = Math.hypot(dx, dy); cx += dx / n * D.spacing; cy += dy / n * D.spacing; }
      discs.push({ x: cx, y: cy, r: D.radius, level: k + 1 });
    }
    if (discs.some((a, i) => discs.some((b, j) => j > i + 1 && Math.hypot(a.x - b.x, a.y - b.y) < D.spacing))) continue; // the chain must not fold back on itself
    if (!discs.every((d) => under(d.x, d.y).every(([x, y]) => free(x, y)))) continue;
    map.skyDiscs = discs.map((d) => ({ ...d, x: Math.round(d.x * 100) / 100, y: Math.round(d.y * 100) / 100 }));
    return map.skyDiscs.at(-1);
  }
  return null;
}
// The disc under a foot point, at `level` (or the highest one of at most `maxLevel`).
export function discAt(map, fx, fy, { level = null, maxLevel = Infinity, below = Infinity } = {}) {
  let best = null; for (const d of map?.skyDiscs || []) if (Math.hypot(fx - d.x, fy - d.y) <= d.r && (level === null ? d.level <= maxLevel && d.level < below : d.level === level) && (!best || d.level > best.level)) best = d;
  return best;
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
