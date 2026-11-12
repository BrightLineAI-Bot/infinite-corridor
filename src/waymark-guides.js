// Waymark guides (Tim, 2026-11-11): "each kind of mark should lead to ONE real destination of its kind somewhere ahead...
// if you follow a kind of mark you reach one", without the old cost (the crossing and unusual-site marks built up to forty
// neighbouring sections to look for a dungeon or a shrine). Each kind has its own seeded lattice of square cells
// (`cell` sections a side). Every cell names one host section, in closed form: the sections of the cell's middle band in a
// seeded order, the first that passes cheap exclusions (no town, hamlet, open sea, Pentagon block or far-domain heart; the
// kinds' bands never share a section). On ground first seen with the guides (atlas `guideVersion`), the host holds its destination:
//   - skyway  (amber chevron, signal `crossing`): a skyway, the floating-disc ascent to the Skylands (game.ts, skylands.ts);
//   - shrine  (violet spiral, signal `event`):    a Watcher's Shrine, the overworld teleport shrine (watcher.ts);
//   - lair    (red triangle, signal `danger`):    a world boss, a free world beast the Aperture has woken claims it on the
//                                                  first visit (game.ts claimGuideLair).
// A mark shows on a guided section only when a host it has not visited lies within `reach` sections, and it points at the
// nearest one, so following marks of one kind always closes on a host (the nearest one gets nearer with each step).
// Tim (2026-11-11): the destination should be about 8-10 sections away when the trail is picked up. Cells of 10 with hosts in
// their middle band put the next host of a kind 8-10 sections from the last in most cases (7-11 in nearly all; tests measure it).
// The rest of the world is untouched: skyways, shrines and world-beast meetings still come by their own rolls too.
// Cost: a handful of hashes and memoised cheap tests per cell, nine cells per kind per section entered; nothing per frame.
import { hashSeed } from "./random.js?v=r910-8a0a850f5b5a";
import { openSeaQuick } from "./landscape.js?v=r910-8a0a850f5b5a";
import { hamletSection } from "./settlements.js?v=r910-8a0a850f5b5a";
import { pentagonCentre } from "./pentagon.js?v=r910-8a0a850f5b5a";
import { FAR_DOMAINS, farDomainCentre } from "./far-realms.js?v=r910-8a0a850f5b5a";
import { WORLD_BEASTS, WORLD_BEAST_IDS, beastUnlocked, beastRoamsAt } from "./world-beasts.js?v=r910-8a0a850f5b5a";

export const WAYMARK_GUIDES = {
  version: 1,       // the atlas pin (`guideVersion`) for ground first seen with the guides; a change to where hosts stand is a new version
  cell: 10,         // sections a side of a lattice cell: one destination of each kind per cell
  band: [3, 6],     // where in its cell (each axis) a host may stand: neighbouring hosts of a kind are 7-13 sections apart on that axis
  reach: 12,        // a mark shows only when its destination is at most this many sections away (Manhattan; a cell two away is always 14 or more)
  pickup: [8, 10],  // the distance (sections) a trail is meant to start at, from one destination to the next of its kind (tests hold most trails to it)
  memo: 1024,       // cell hosts remembered (cleared when full)
  seaVersion: 23,   // the landscape version whose open sea rules a host out (pinned: a later landscape must not move version 1 hosts)
  seaMargin: .25,   // the quick open-sea test settles from 16 samples when they are this far from the sea share; else all 256
  domainClear: 2,   // sections round a far domain's heart that never host
  lairSkip: ["astralWorm", "voidWalker"], // beasts a lair never calls (as for passing beasts: the Worm's companion rules, the Walker's dungeon home)
  kinds: { // `origin` shifts each kind's lattice: with these the three bands never share a section (skyway x 3-6 y 3-6, shrine x and y 8-1, lair x 8-1 y 3-6, mod 10)
    skyway: { signal: "crossing", name: "a skyway", origin: [0, 0], minDepth: 6 },
    shrine: { signal: "event", name: "a Watcher's Shrine", origin: [5, 5], minDepth: 3 },
    lair: { signal: "danger", name: "a world boss", origin: [5, 0], minDepth: 6 },
  },
};
export const GUIDE_KINDS = Object.keys(WAYMARK_GUIDES.kinds);
export const GUIDE_SIGNALS = Object.fromEntries(GUIDE_KINDS.map((k) => [WAYMARK_GUIDES.kinds[k].signal, k]));

const settledAt = new Set(["4,-2", "-5,3"]); // world.ts SETTLEMENTS (the two old towns); not imported, so world.ts may import this module
const domainNear = (seed, rx, ry) => Object.keys(FAR_DOMAINS).some((id) => { const c = farDomainCentre(seed, id); return Math.abs(c.rx - rx) + Math.abs(c.ry - ry) <= WAYMARK_GUIDES.domainClear; });
// May (rx, ry) host a destination of `kind`? Cheap tests only (the kinds' bands never meet, so no section hosts two).
export function guideHostable(seed, kind, rx, ry) {
  const K = WAYMARK_GUIDES.kinds[kind];
  if (Math.abs(rx) + Math.abs(ry) < K.minDepth || settledAt.has(`${rx},${ry}`) || pentagonCentre(rx, ry)) return false;
  return !hamletSection(seed, rx, ry) && !domainNear(seed, rx, ry) && !openSeaQuick(seed, rx, ry, WAYMARK_GUIDES.seaMargin, WAYMARK_GUIDES.seaVersion);
}
const floorDiv = (a, n) => Math.floor(a / n);
export function guideCell(kind, rx, ry) { const G = WAYMARK_GUIDES, [ox, oy] = G.kinds[kind].origin; return { cx: floorDiv(rx - ox, G.cell), cy: floorDiv(ry - oy, G.cell) }; }
const hosts = new Map();
// The host section of a cell, or null.
export function guideCellHost(seed, kind, cx, cy) {
  const key = `${seed}\u0001${kind}\u0001${cx}\u0001${cy}`; if (hosts.has(key)) return hosts.get(key);
  const G = WAYMARK_GUIDES, [ox, oy] = G.kinds[kind].origin, [lo, hi] = G.band, w = hi - lo + 1, x0 = cx * G.cell + ox + lo, y0 = cy * G.cell + oy + lo; let out = null;
  const order = Array.from({ length: w * w }, (_, i) => i), rank = (i) => hashSeed(`${seed}:waymark-guide:v${G.version}:${kind}:${cx}:${cy}:${i}`);
  order.sort((a, b) => rank(a) - rank(b) || a - b); // every band section once, in a seeded order: a cell has no host only when all of them are ruled out
  for (const i of order) { const rx = x0 + (i % w), ry = y0 + Math.floor(i / w); if (guideHostable(seed, kind, rx, ry)) { out = { rx, ry }; break; } }
  if (hosts.size >= G.memo) hosts.clear(); hosts.set(key, out); return out;
}
// Does (rx, ry) host a destination of `kind`?
export function guideHost(seed, kind, rx, ry) { const { cx, cy } = guideCell(kind, rx, ry), h = guideCellHost(seed, kind, cx, cy); return !!h && h.rx === rx && h.ry === ry; }
// The destination of `kind` a mark on (rx, ry) points at: the nearest host within `reach` that `skip(rx, ry)` does not rule out
// (one already visited), or null. Nine cells are enough: a cell two away is always farther than `reach` (cell + 1 + band[0] > reach).
export function guideTarget(seed, kind, rx, ry, skip = null) {
  const G = WAYMARK_GUIDES, { cx, cy } = guideCell(kind, rx, ry); let best = null;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const h = guideCellHost(seed, kind, cx + dx, cy + dy); if (!h) continue;
    const d = Math.abs(h.rx - rx) + Math.abs(h.ry - ry); if (d < 1 || d > G.reach || (skip && skip(h.rx, h.ry))) continue;
    if (!best || d < best.d || (d === best.d && (h.ry < best.ry || (h.ry === best.ry && h.rx < best.rx)))) best = { kind, rx: h.rx, ry: h.ry, d, name: G.kinds[kind].name };
  }
  return best;
}
// The world beast a lair at (rx, ry) would call now, or null: one the Aperture has woken, roaming there, deep enough, not
// holding ground or hunting anywhere; one not cooling down after its last hunt first. Chosen by the seed and the section.
export function guideLairBeast(save, rx, ry) {
  const depth = Math.abs(rx) + Math.abs(ry), free = (id) => { const q = save?.worldBeasts?.[id]; return !q?.active; };
  const ids = WORLD_BEAST_IDS.filter((id) => !WAYMARK_GUIDES.lairSkip.includes(id) && free(id) && depth >= WORLD_BEASTS[id].minDepth && beastUnlocked(save, id) && beastRoamsAt(id, rx, ry));
  if (!ids.length) return null; const rested = ids.filter((id) => !(Number(save.worldBeasts?.[id]?.cooldown) > 0)), pool = rested.length ? rested : ids;
  return pool[hashSeed(`${save.seed}:waymark-lair:v${WAYMARK_GUIDES.version}:${rx}:${ry}`) % pool.length];
}
export const guideHostCacheSize = () => hosts.size;
export function clearGuideHosts() { hosts.clear(); }
