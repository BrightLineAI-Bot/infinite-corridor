// The Crimson Tyrant's claim on the ground (release 709). Tim, 2026-11-03: "it just starts... turning things to lava... different
// portions of the floor just start turning to lava, and they'll just be lava forever... raised, elevated platforms won't turn to lava,
// but the whole rest of the floor will... if you don't kill him before he does it like 3 times maybe 4 times... you can't interrupt
// him... if you die... after he's done it 4 times then he just leaves... the timer, when he does that move doesn't stop when the
// player dies... he wants to just colonize that entire square for himself".
//
// Each section it holds keeps { casts, nextAt, tiles } in `save.dragonLava["rx,ry"]` (additive at schema 14). `nextAt` is in seconds
// of play (`save.playSeconds`): the clock runs whether or not the Wayfarer is there, and the casts it missed are made on arrival.
// A cast turns the next share of the section's open floor to lava (cast k of `casts`: k/casts of it), in patches that grow from a few
// seeded centres. Never raised ground, slopes, water, structures or buildings, and never within `border` tiles of the edge, so there is
// always ground to arrive on and leave by. The tiles are applied to the section every time it is loaded: they stay lava.
import { hashSeed } from "./random.js?v=r906-edc5b9bbd14c";
import { DRAGON } from "./monster-pack.js?v=r906-edc5b9bbd14c";

export const DRAGON_LAVA = { maxSections: 24, centres: 4 };
const KEEP = new Set(["lava", "abyss", "canyon", "river", "dungeonWater", "water", "ocean", "deepOcean", "lakeWater", "shallows", "swampWater", "mireWater", "toxicWater"]);
export const lavaKey = (rx, ry) => `${rx},${ry}`;

export function ensureDragonLava(save) {
  const raw = save?.dragonLava, out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [k, r] of Object.entries(raw).slice(-DRAGON_LAVA.maxSections)) {
    if (!/^-?\d+,-?\d+$/.test(k) || !r || typeof r !== "object") continue;
    out[k] = { ...r, casts: Math.max(0, Math.min(DRAGON.colonize.casts, Math.floor(Number(r.casts) || 0))), nextAt: Number.isFinite(Number(r.nextAt)) ? Number(r.nextAt) : null,
      tiles: (Array.isArray(r.tiles) ? r.tiles : []).filter((i) => Number.isInteger(i) && i >= 0 && i < 1024).slice(0, 1024) };
  }
  if (save) save.dragonLava = out;
  return save;
}
export function dragonRecord(save, rx, ry) { const L = (save.dragonLava ||= {}); return (L[lavaKey(rx, ry)] ||= { casts: 0, nextAt: null, tiles: [] }); }

// The section's open floor in the order the Tyrant claims it: nearest one of a few seeded centres first.
export function lavaOrder(map, seed, rx, ry) {
  const W = 32, B = DRAGON.colonize.border, h = (k) => hashSeed(`${seed}:dragon-lava:v1:${rx}:${ry}:${k}`);
  const centres = Array.from({ length: DRAGON_LAVA.centres }, (_, i) => ({ x: B + 2 + h(`cx${i}`) % (W - 2 * B - 4), y: B + 2 + h(`cy${i}`) % (W - 2 * B - 4) }));
  const open = (map.tiles || []).filter((t) => t && t.x >= B && t.y >= B && t.x < W - B && t.y < W - B && !t.blocked && !t.structure && !t.buildingId && !t.slope && !(t.elev > 0) && !t.canopy && (t.dragonLava || !KEEP.has(t.kind))); // its own lava stays in the plan, so every cast takes the same share
  const score = (t) => Math.min(...centres.map((c) => Math.hypot(t.x - c.x, t.y - c.y))) + (h(`j${t.x},${t.y}`) % 100) / 60;
  return open.map((t) => [t, score(t)]).sort((a, b) => a[1] - b[1]).map(([t]) => t.y * W + t.x);
}
// The tiles cast `k` (1-based) adds.
export function castTiles(map, seed, rx, ry, k) {
  const order = lavaOrder(map, seed, rx, ry), n = DRAGON.colonize.casts, from = Math.floor(order.length * (k - 1) / n), to = k >= n ? order.length : Math.floor(order.length * k / n);
  return order.slice(from, to);
}
export function applyDragonLava(save, map, rx, ry) {
  const r = save?.dragonLava?.[lavaKey(rx, ry)]; if (!r?.tiles?.length || !map?.tiles) return 0;
  let n = 0; for (const i of r.tiles) { const t = map.tiles[i]; if (t && t.kind !== "lava" && !(t.elev > 0)) { t.kind = "lava"; t.dragonLava = true; t.blocked = false; n++; } }
  return n;
}
// Make cast `casts + 1` on this section: record and apply it. Returns the tiles it turned.
export function dragonCast(save, map, seed, rx, ry) {
  const r = dragonRecord(save, rx, ry); if (r.casts >= DRAGON.colonize.casts) return [];
  r.casts++; const tiles = castTiles(map, seed, rx, ry, r.casts), have = new Set(r.tiles);
  for (const i of tiles) if (!have.has(i)) r.tiles.push(i);
  applyDragonLava(save, map, rx, ry); return tiles;
}
