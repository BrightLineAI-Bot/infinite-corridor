// Diving (water world W5, docs/water-world-design.md; design-decisions "Traversal horizon — water", stage two).
// The Bathysal Lens (found at an island landmark) and a dive rig (bought from a Shipwright once you own a skiff) set
// `capabilities.dive`. Dive sites are buoys on deep water; diving loads a separate underwater scene through the dungeon
// path (id prefix `dive:`, a bounded `arena` map, so dungeon completion and discovery do not apply). Below, a readable
// breath meter drains; air pockets refill it; at zero the diver takes damage until they reach air or surface.
// Data and pure rules; game.ts calls in from interaction, area loading and update.
import { hashSeed, rng } from "./random.js?v=r265-b893dc6cad5c";
import { annotateDungeon } from "./dungeon-framework.js?v=r265-b893dc6cad5c";

export const DIVE = {
  rig: { currency: 80, cinderIron: 2 },
  breath: 20,              // seconds of air
  refillPerSecond: 12,     // at an air pocket
  pocketRadius: 1.3,
  drownDamagePerSecond: 8,
  speed: .8,               // x walking speed under water
  siteTiles: 60,           // deep-ocean tiles a section needs for a dive site
  siteEvery: 3,            // about one in this many such sections
  siteFromPlaza: 5,
  maxPocketGap: 9,         // tiles of path between breaths (well inside 20 s at 0.8 x 2.4 tiles/s)
};

export const hasLens = (save) => save?.worldFlags?.bathysalLens === true;
export const hasRig = (save) => save?.worldFlags?.diveRig === true;
export const canDive = (save) => save?.capabilities?.dive === true;
function refreshDive(save) { save.capabilities ||= {}; if (hasLens(save) && hasRig(save)) save.capabilities.dive = true; return canDive(save); }

// The Lens rests at island landmarks: the first one inspected yields it.
export function grantLens(save, source) {
  save.worldFlags ||= {};
  if (hasLens(save)) return false;
  save.worldFlags.bathysalLens = true;
  save.worldFlags.bathysalLensSource = String(source || "island");
  refreshDive(save);
  return true;
}
export function buyRig(save) {
  if (hasRig(save)) return { ok: false, message: "You already carry a dive rig." };
  if (save.boat?.owned !== true) return { ok: false, message: "Shipwright: “A rig is for divers with a boat to dive from. Buy a skiff first.”" };
  const p = DIVE.rig;
  if ((save.currency || 0) < p.currency || (save.materials?.cinderIron || 0) < p.cinderIron) return { ok: false, message: `Shipwright: “A dive rig costs ${p.currency} marks and ${p.cinderIron} cinder iron.”` };
  save.currency -= p.currency; save.materials.cinderIron -= p.cinderIron;
  save.worldFlags ||= {}; save.worldFlags.diveRig = true;
  return { ok: true, message: refreshDive(save) ? "Dive rig bought. With the Bathysal Lens you can dive at any dive buoy." : "Dive rig bought. You still need a Bathysal Lens to see below — island shrines are said to keep them." };
}
export function diveSiteActions(save) { return canDive(save) ? ["dive"] : ["inspect"]; }
export function diveSiteHint(save) {
  if (canDive(save)) return "A dive buoy. The water below is dark but reachable.";
  return `A dive buoy over deep water. You need ${hasLens(save) ? "" : "a Bathysal Lens (island shrines keep them)"}${!hasLens(save) && !hasRig(save) ? " and " : ""}${hasRig(save) ? "" : "a dive rig (Shipwright)"} to dive.`;
}

// Deterministic dive site for a landscape section (version 2+), or null.
export function diveSite(map, seed, rx, ry) {
  if (!map?.landscape || (map.landscape.version || 1) < 2) return null;
  const deep = map.tiles.filter((t) => t.kind === "deepOcean" && Math.hypot(t.x - 16, t.y - 16) >= DIVE.siteFromPlaza && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
  if (deep.length < DIVE.siteTiles || hashSeed(`${seed}:dive:site:${rx}:${ry}`) % DIVE.siteEvery !== 0) return null;
  const t = deep[hashSeed(`${seed}:dive:spot:${rx}:${ry}`) % deep.length];
  return { id: `dive-site-${rx}-${ry}`, kind: "diveSite", name: "Dive buoy", x: t.x, y: t.y, state: "idle", actions: ["dive"] };
}
export const diveId = (seed, rx, ry) => `dive:${seed}:${rx}:${ry}`;

// Breath for one frame. Returns damage to apply (0 while air lasts).
export function breathe(session, dt, atPocket) {
  session.breath = Number.isFinite(session.breath) ? session.breath : DIVE.breath;
  if (atPocket) { session.breath = Math.min(DIVE.breath, session.breath + DIVE.refillPerSecond * dt); return 0; }
  if (session.breath > 0) { session.breath = Math.max(0, session.breath - dt); return 0; }
  return DIVE.drownDamagePerSecond * dt;
}

// ---------------------------------------------------------------- the underwater scene
// A winding seabed cave carved upward from the entry (where the line runs back to the surface) to a sunken cache,
// with side chambers, kelp and air pockets placed so no stretch of the main path is longer than `maxPocketGap`.
export function generateDiveSite(seed, id) {
  const r = rng(`${seed}:dive:v1:${id}`), width = 28, height = 24, tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push({ x, y, kind: "seabedRock", blocked: true, elev: 0, landscape: "underwater", detail: hashSeed(`${id}:${x}:${y}`) % 997 });
  const at = (x, y) => tiles[y * width + x], open = (x, y, kind = "seabed") => { if (x > 0 && y > 0 && x < width - 1 && y < height - 1) Object.assign(at(x, y), { kind, blocked: false }); };
  const entry = { x: 14, y: height - 3 }, path = [];
  let x = entry.x, y = entry.y;
  path.push({ x, y });
  while (y > 3) { // drift up with sideways meanders, carving a corridor two or three tiles wide
    const step = r();
    if (step < .55) y--; else if (step < .78) x = Math.max(3, x - 1); else x = Math.min(width - 4, x + 1);
    path.push({ x, y });
  }
  for (const p of path) for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) open(p.x + dx, p.y + dy);
  const chambers = [];
  for (let i = 0; i < 3; i++) { // side chambers off the path
    const p = path[Math.floor((i + 1) * path.length / 4)], cx = Math.max(4, Math.min(width - 5, p.x + (r() < .5 ? -4 : 4))), cy = p.y;
    for (let yy = cy - 2; yy <= cy + 2; yy++) for (let xx = cx - 2; xx <= cx + 2; xx++) if (Math.hypot(xx - cx, yy - cy) <= 2.4) open(xx, yy);
    for (let k = Math.min(p.x, cx); k <= Math.max(p.x, cx); k++) open(k, cy);
    chambers.push({ x: cx, y: cy });
  }
  const end = path[path.length - 1];
  for (let yy = end.y - 1; yy <= end.y + 2; yy++) for (let xx = end.x - 2; xx <= end.x + 2; xx++) open(xx, yy);
  for (const t of tiles) if (!t.blocked && r() < .08) t.kind = "kelp";
  // air pockets along the path, never more than maxPocketGap apart (counted from the entry, where the surface line is)
  const objects = [], pockets = [];
  let since = 0;
  for (let i = 1; i < path.length; i++) { since++; if (since >= DIVE.maxPocketGap - 1 && i < path.length - 2) { pockets.push(path[i]); since = 0; } }
  pockets.push(chambers[1]);
  pockets.forEach((p, i) => { open(p.x, p.y, "airVent"); objects.push({ id: `${id}:air-${i}`, kind: "airPocket", name: "Air pocket", x: p.x, y: p.y, state: "idle", actions: [] }); });
  objects.push({ id: `${id}:surface`, kind: "diveExit", name: "Surface line", x: entry.x, y: entry.y, state: "open", actions: ["surface"] });
  objects.push({ id: `${id}:cache`, kind: "chest", name: "Sunken cache", x: end.x, y: end.y, state: "closed", actions: ["open"], rewardSource: "dive-cache" });
  open(entry.x, entry.y);
  return annotateDungeon({ seed, id, recipe: "dive-site", arena: true, arenaKind: "dive", underwater: true, name: "Sunken Reach", identity: "dive site", width, height, tiles, entry, exit: entry,
    objects, enemySpawns: [], landscape: { version: 1, biome: "underwater", name: "Sunken Reach" }, weather: "drip", path, pockets }, { classification: "bounded-arena", discoveryEnabled: false, generatorVersion: 1, sizeProfile: "arena" });
}
