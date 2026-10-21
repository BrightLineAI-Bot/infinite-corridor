// World beasts (release 235; Tim, 2026-10-19: "more monsters similar to the Questing Beast … strong … varied moves and
// attacks … hyper-aggressive … crazy amounts of health … roaming world bosses … you still get three tries"). Each one
// works the way the Questing Beast does (src/questing-beast.ts, which is left as it was): now and then it claims a wild
// section; it stays until it is killed or it has killed the Wayfarer `tries` times; then it is gone, and after a
// cooldown counted in sections entered a new hunt can begin somewhere else. Its health and blows are tuned to the
// Wayfarer's power. The creature itself (body, attacks, brain) is a Monster Pack entry; this module holds only the hunt.
import { hashSeed } from "./random.ts";
import { LETHAL_KINDS, canStep } from "./landscape.ts";
import { sectionExits } from "./world.ts";

// One row per beast. `kind` is its MONSTER_PACK id. Balance lives here.
export const WORLD_BEASTS = {
  morphingBlob: {
    kind: "morphingBlob", name: "The Morphing Blob", chance: .03, minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 70, hpPerLevel: 30, damageShare: .22, speed: 1, attackGap: .18, staggerResistance: .95, rewardMarks: 170, rewardPerLevel: 17,
    patience: 180, home: "mire", retreatMoves: "walk",
    flee: "The Morphing Blob has had enough of you. It pulls itself together and flows away toward the Blight Mire.",
    homeLine: "The Morphing Blob slides into the toxic pools of the mire and is gone.",
    arrive: "Something wet and enormous has settled over this ground. The Morphing Blob is here.",
    slain: "The Morphing Blob shudders, sags and runs away into the soil.",
    gone: "The Morphing Blob has fed enough on you, and seeps away. In time it will settle somewhere else.",
  },
  tremorWorm: {
    kind: "tremorWorm", name: "The Tremor Worm", chance: .03, minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 62, hpPerLevel: 28, damageShare: .22, speed: 1, attackGap: .2, staggerResistance: .95, rewardMarks: 175, rewardPerLevel: 17,
    patience: 180, home: "dunes", retreatMoves: "burrow",
    flee: "The Tremor Worm dives and swims away under the ground, toward the Dune Sea.",
    homeLine: "The Tremor Worm's wake reaches the dunes and sinks into the sand.",
    arrive: "The ground here trembles under your feet. The Tremor Worm is hunting.",
    slain: "The Tremor Worm thrashes, sinks, and the ground stops shaking.",
    gone: "The Tremor Worm has had its fill of you, and sinks away. In time it will surface somewhere else.",
  },
  mountainTurtle: {
    kind: "mountainTurtle", name: "The Mountain Turtle", chance: .025, minDepth: 6, tries: 3, cooldownSlain: 22, cooldownEscaped: 28,
    hitsToKill: 78, hpPerLevel: 34, damageShare: .24, speed: 1, attackGap: .35, staggerResistance: 1, rewardMarks: 190, rewardPerLevel: 19,
    patience: 180, home: "canyon", retreatMoves: "through",
    flee: "The Mountain Turtle turns its great head away and walks off toward the canyons, through whatever stands in its way.",
    homeLine: "The Mountain Turtle steps over the canyon's edge and climbs down out of sight.",
    arrive: "The ground shakes with slow, enormous footsteps. The Mountain Turtle walks here.",
    slain: "The Mountain Turtle sinks to its knees, and its shell settles like a tomb.",
    gone: "The Mountain Turtle has trampled you enough, and walks on. In time it will settle somewhere else.",
  },
  nanobotKnight: {
    kind: "nanobotKnight", name: "The Nanobot Knight", chance: .025, minDepth: 6, tries: 3, cooldownSlain: 22, cooldownEscaped: 28,
    hitsToKill: 60, hpPerLevel: 28, damageShare: .22, speed: 1.1, attackGap: .22, staggerResistance: .95, rewardMarks: 190, rewardPerLevel: 19,
    patience: 180, home: "glass", retreatMoves: "through",
    flee: "The Nanobot Knight comes apart into a red-black swarm and streams away toward the glass.",
    homeLine: "The swarm settles into the glass and soaks into it like water into sand.",
    arrive: "Something black and red stands very still here, and the air hums. The Nanobot Knight is waiting.",
    slain: "The Nanobot Knight's armour falls empty, and the swarm inside it goes dark.",
    gone: "The Nanobot Knight has learned you, and drifts apart. In time it will gather somewhere else.",
  },
  psychicCrystal: {
    kind: "psychicCrystal", name: "The Psychic Crystal", chance: .025, minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 58, hpPerLevel: 26, damageShare: .2, speed: 1, attackGap: .3, staggerResistance: .9, rewardMarks: 180, rewardPerLevel: 18,
    patience: 180, home: "water", retreatMoves: "through",
    dungeonChance: .35, dungeonMinLevel: 1, // Follow-on: level is a strength floor, not eligibility; water and depth still required
    flee: "The Psychic Crystal's haze goes still and grey. It drifts away toward open water.",
    fleeDungeon: "The Psychic Crystal's haze goes still and grey. It drifts toward the water.",
    homeLine: "The Psychic Crystal sinks into the water without a ripple, and is gone.",
    arrive: "The air here is thin and bright, and your thoughts feel watched. The Psychic Crystal is here.",
    arriveDungeon: "A pale light drifts through the halls. The Psychic Crystal roams this place.",
    slain: "The Psychic Crystal cracks from end to end, and its light goes out.",
    gone: "The Psychic Crystal has had enough of your mind. It drifts away; in time it will settle somewhere else.",
  },
  // Initial balance proposal; owner requirements and open design decisions are in docs/void-walker-design.md.
  voidWalker: {
    kind: "voidWalker", name: "The Void Walker", chance: .025, minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 60, hpPerLevel: 28, damageShare: .2, speed: 1.1, attackGap: .3, staggerResistance: .9, rewardMarks: 180, rewardPerLevel: 18,
    patience: 180, home: "dungeon", retreatMoves: "walk", dungeonChance: .3, dungeonMinLevel: 1,
    flee: "The Void Walker folds its rends shut and leaves toward a dungeon entrance.",
    fleeDungeon: "The Void Walker closes its constellation and heads for the nearest reachable dungeon door.",
    homeLine: "The Void Walker passes through the dungeon door and is gone.",
    arrive: "A figure your own size stands beneath a tear of violet stars. The Void Walker is here.",
    arriveDungeon: "Violet starlight moves through the halls. The Void Walker roams this place.",
    slain: "The Void Walker's silhouette unravels into a scattering of stars.",
    gone: "The Void Walker closes its hunt. In time, another rend will open.",
  },
};
export const WORLD_BEAST_IDS = Object.keys(WORLD_BEASTS);
// One exact shared marine classification for encounter placement, movement, attack variants and scars.
// Lake, river, swamp, dungeon water and shallows retain their existing behavior.
export const isMarineTile = (tile) => tile?.kind === "ocean" || tile?.kind === "deepOcean";
export const marineTileOpen = (tile) => isMarineTile(tile) && !tile.structure && !tile.buildingId && !tile.environment && !tile.pit;

// Release 239 (Tim, 2026-10-20): a beast that has neither killed the Wayfarer nor died within its `patience` (seconds of
// fighting in its section) gives up and retreats home: invulnerable, finding its way across the land (see RETREAT_GROUND),
// section after section, until it reaches its home ground and goes into it. The Wayfarer can follow and watch;
// stop following and it is gone. Homes: a section that has one (`section`), and in it the ground it goes into (`tile`,
// or `object`). Later beasts name theirs here too: the Void Walker a dungeon, the Psychic Crystal water, the Mountain
// Turtle a canyon, the Nanobot Knight glass.
export const BEAST_HOMES = {
  mire: { name: "the Blight Mire", section: (q) => q.biome === "blight" || q.biome === "swamp", tile: (t) => ["toxicWater", "swampWater", "toxicBog", "toxicMire", "mireWater"].includes(t.kind) },
  dunes: { name: "the Dune Sea", section: (q) => q.biome === "desert", tile: (t) => t.landscape === "desert" },
  water: { name: "open water", section: (q) => ["sea", "coast", "lake", "isles"].includes(q.biome), tile: (t) => ["ocean", "deepOcean", "lakeWater", "shallows", "dungeonWater"].includes(t.kind) },
  canyon: { name: "a canyon", section: (q) => q.canyon, tile: (t) => t.kind === "canyon" },
  glass: { name: "the glass", section: (q) => q.dominant === "glass", tile: (t) => t.kind === "glass" },
  dungeon: { name: "a dungeon", section: (q) => q.dungeon, object: (o) => o.kind === "dungeon" },
};
// How a retreating beast crosses the land (Tim: "it should still respect the geometry of the world"): `walk` goes around
// walls, jumps chasms and needs a bridge over water; `burrow` passes under walls but not under water; `through` (the
// Mountain Turtle, too big to care) goes over everything. Its body is its own business: only the tile it walks matters.
export const RETREAT_GROUND = {
  water: new Set(["ocean", "deepOcean", "lakeWater", "swampWater", "toxicWater", "river", "dungeonWater", "water", "alienPool"]),
  chasm: new Set(["canyon", "abyss", "lava"]),
};
export function retreatPassable(t, mode) {
  if (!t) return false;
  if (mode === "through") return true;
  const water = RETREAT_GROUND.water.has(t.kind);
  if (mode === "burrow") return !water;
  return RETREAT_GROUND.chasm.has(t.kind) || (!t.blocked && !water);
}
// A path across the section (8-way, no cutting corners) from `from` to `to`, as waypoints; chasm tiles are marked `leap`.
// Null when there is no way: then it goes straight, by its own laws.
export function retreatPath(map, from, to, mode, width = 32) {
  const tiles = map?.tiles || [], height = Math.floor(tiles.length / width) || 32, cell = (x, y) => ({ x: Math.max(0, Math.min(width - 1, Math.round(x))), y: Math.max(0, Math.min(height - 1, Math.round(y))) });
  const a = cell(from.x, from.y), b = cell(to.x, to.y), key = (x, y) => y * width + x, goal = key(b.x, b.y);
  const ok = (x, y) => x >= 0 && y >= 0 && x < width && y < height && (key(x, y) === goal || retreatPassable(tiles[key(x, y)], mode));
  const prev = new Int32Array(width * height).fill(-1), queue = [key(a.x, a.y)]; prev[queue[0]] = queue[0];
  for (let i = 0; i < queue.length && prev[goal] < 0; i++) {
    const k = queue[i], x = k % width, y = Math.floor(k / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (!ok(nx, ny) || prev[key(nx, ny)] >= 0) continue;
      if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
      prev[key(nx, ny)] = k; queue.push(key(nx, ny));
    }
  }
  if (prev[goal] < 0) return null;
  const cells = []; for (let k = goal; ; k = prev[k]) { cells.push(k); if (prev[k] === k) break; }
  cells.reverse();
  const out = [];
  for (let i = 1; i < cells.length; i++) { // keep the turns (and every chasm tile), drop the straight runs
    const k = cells[i], x = k % width, y = Math.floor(k / width), leap = RETREAT_GROUND.chasm.has(tiles[k]?.kind) && mode === "walk";
    const n = cells[i + 1], p = cells[i - 1], straight = n !== undefined && (n % width) - x === x - (p % width) && Math.floor(n / width) - y === y - Math.floor(p / width);
    if (!straight || leap) out.push({ x, y, ...(leap ? { leap: true } : {}) });
  }
  out.push({ x: to.x, y: to.y });
  return out;
}
export const RETREAT = { search: 8, fallback: 6, speed: 2.1, inset: 1.5, fade: 1.4 };
const SIDES = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }, OPPOSITE = { east: "west", west: "east", north: "south", south: "north" };

// Counts fighting time; true when the beast's patience has just run out.
export function worldBeastPatience(save, id, dt) {
  const q = save.worldBeasts?.[id]?.active; if (!q || q.retreat) return false;
  q.patience = (Number(q.patience) || 0) + dt;
  return q.patience >= WORLD_BEASTS[id].patience;
}
// Chooses its home: the nearest section (by steps across sections) that has its home ground, searched out to
// RETREAT.search; `probe(rx, ry)` describes a section ({ biome, dominant, canyon, dungeon }). With none in reach it flees
// RETREAT.fallback sections straight away and fades into the distance there.
export function beginRetreat(save, id, rx, ry, probe) {
  ensureWorldBeasts(save, false); const B = WORLD_BEASTS[id], q = save.worldBeasts[id], H = BEAST_HOMES[B.home];
  let home = null;
  for (let d = 0; d <= RETREAT.search && !home; d++) {
    const ring = [];
    for (let dx = -d; dx <= d; dx++) for (const dy of new Set([d - Math.abs(dx), -(d - Math.abs(dx))])) ring.push({ rx: rx + dx, ry: ry + dy });
    ring.sort((a, b) => hashSeed(`${save.seed}:beast-home:${id}:${a.rx},${a.ry}`) - hashSeed(`${save.seed}:beast-home:${id}:${b.rx},${b.ry}`));
    home = ring.find((c) => !(c.rx === 0 && c.ry === 0) && H.section(probe(c.rx, c.ry))) || null;
  }
  const away = Object.values(SIDES)[hashSeed(`${save.seed}:beast-away:${id}:${q.cycle}`) % 4];
  q.active.retreat = { home: home ? { ...home, found: true } : { rx: rx + away[0] * RETREAT.fallback, ry: ry + away[1] * RETREAT.fallback, found: false }, side: null, legs: 0 };
  return { message: home ? B.flee : B.flee.replace(/toward [^.]*\./, "into the distance."), home: q.active.retreat.home };
}
// The way out of a section toward its home: the side it leaves by, or null when this is the home section.
export function retreatSide(r, rx, ry) {
  if (r.home.dungeon) return null; // already in its home dungeon: water for the Crystal, entry for the Walker
  const dx = r.home.rx - rx, dy = r.home.ry - ry;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "east" : "west") : (dy > 0 ? "south" : "north");
}
// Actual exits and physical inter-level passages, never room doors or teleport portals. A level landing is not an
// exterior entrance. Legacy single-level maps may expose only `entry`; generated maps expose exit objects.
export function walkerRetreatDoors(map, area = "dungeon") {
  const kinds = area === "dungeon" ? ["exit", "deepTransition"] : ["dungeon"], represented = (map?.objects || []).filter(o => kinds.includes(o.kind));
  const doors = represented.length ? represented.filter(o => !["closed", "locked", "sealed", "dormant", "hidden"].includes(o.state)) :
    area === "dungeon" && !map?.multiLevel && map?.entry ? [map.entry] : [];
  return doors.filter(o => Number.isFinite(o.x) && Number.isFinite(o.y)).map(o => ({ x: o.x, y: o.y }))
    .sort((a, b) => a.y - b.y || a.x - b.x).filter((o, i, all) => !i || o.x !== all[i - 1].x || o.y !== all[i - 1].y);
}
// Where a retreating beast is heading in the loaded section: the gate it leaves by, or the home ground it goes into.
export function retreatTarget(r, id, map, rx, ry, exits, from) {
  const side = retreatSide(r, rx, ry);
  if (side) return { x: side === "east" ? 31.4 : side === "west" ? -.4 : exits[side], y: side === "south" ? 31.4 : side === "north" ? -.4 : exits[side], side };
  if (id === "voidWalker") {
    const doors = walkerRetreatDoors(map, r.home.dungeon ? "dungeon" : "overworld");
    return { ...(doors[0] || { x: from.x, y: from.y }), side: null, home: true, nearestDoor: true };
  }
  const H = BEAST_HOMES[WORLD_BEASTS[id]?.home] || null, spots = !r.home.found || !H ? [] : H.object ? (map.objects || []).filter(H.object) : (map.tiles || []).filter(H.tile);
  const best = spots.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
  return { x: best ? best.x : (Number(map?.width) || 32) / 2 - .5, y: best ? best.y : Math.floor((map?.tiles?.length || 1024) / (Number(map?.width) || 32)) / 2 - .5, side: null, home: true };
}
// The beast crossed out of a section: it is now in the next one, coming in from the opposite side.
export function retreatCrossed(save, id, side, entry = null, actor = null) {
  const q = save.worldBeasts[id].active, [dx, dy] = SIDES[side];
  q.rx += dx; q.ry += dy; q.retreat.side = OPPOSITE[side]; q.retreat.legs++;
  if (id === "voidWalker" && validRetreatEntry(entry, q.retreat.side)) q.retreat.entry = { x: entry.x, y: entry.y };
  else delete q.retreat.entry;
  if (id === "voidWalker" && validRetreatVitals(actor)) q.retreat.vitals = { hp: actor.hp, maxHp: actor.maxHp, damage: actor.damage };
  return { rx: q.rx, ry: q.ry };
}
// It is home, or got away because the Wayfarer did not follow: the hunt ends as an escape (no try is lost).
export function retreatEnded(save, id) {
  const B = WORLD_BEASTS[id], q = save.worldBeasts[id]; q.escaped++; q.cycle++; q.active = null; q.cooldown = B.cooldownEscaped;
  return B.homeLine;
}
// Called on every area load: older beasts escape when unfollowed. An unfinished Walker retreat stays
// in its saved source area/leg until actually reaching its door; unloaded areas are not simulated.
export function worldBeastsLost(save, area, rx, ry, dungeonId = null) {
  ensureWorldBeasts(save, false); const lost = [];
  for (const id of WORLD_BEAST_IDS) { const a = save.worldBeasts[id].active; if (a?.retreat && id !== "voidWalker" && (a.dungeon ? area !== "dungeon" || dungeonId !== a.dungeon : area !== "overworld" || a.rx !== rx || a.ry !== ry)) { retreatEnded(save, id); lost.push(id); } }
  return lost;
}
export const isWorldBeastKind = (kind) => WORLD_BEAST_IDS.some((id) => WORLD_BEASTS[id].kind === kind);

// save.worldBeasts: { id: { cycle, cooldown, active: { rx, ry, tries } | null, slain, escaped } } (additive; unknown ids kept).
export function ensureWorldBeasts(save, normalizeScarHistory = true) {
  const all = save.worldBeasts && typeof save.worldBeasts === "object" ? { ...save.worldBeasts } : {};
  for (const id of WORLD_BEAST_IDS) {
    const q = all[id] && typeof all[id] === "object" ? all[id] : {};
    const a = q.active && ((Number.isInteger(q.active.rx) && Number.isInteger(q.active.ry)) || typeof q.active.dungeon === "string") ? { ...q.active, rx: q.active.rx, ry: q.active.ry, tries: Math.max(0, Math.floor(Number(q.active.tries) || 0)), patience: Math.max(0, Number(q.active.patience) || 0), retreat: cleanRetreat(q.active.retreat) } : null;
    if (a && !a.retreat) delete a.retreat;
    if (a && !a.patience) delete a.patience; // both are added only once there is something to keep
    all[id] = { cycle: Math.max(0, Math.floor(Number(q.cycle) || 0)), cooldown: Math.max(0, Math.floor(Number(q.cooldown) || 0)), active: a, slain: Math.max(0, Math.floor(Number(q.slain) || 0)), escaped: Math.max(0, Math.floor(Number(q.escaped) || 0)) };
  }
  save.worldBeasts = all;
  // Only save creation/migration normalizes all permanent history; gameplay stays independent of other areas.
  ensureVoidScars(save, normalizeScarHistory ? undefined : null);
  return save;
}

function validRetreatVitals(vitals) {
  return vitals && [vitals.hp, vitals.maxHp, vitals.damage].every(Number.isFinite) && vitals.hp > 0 && vitals.maxHp >= vitals.hp && vitals.damage >= 0;
}
function validRetreatEntry(entry, side) {
  return entry && [entry.x, entry.y].every(Number.isFinite) && entry.x >= 0 && entry.x <= 31 && entry.y >= 0 && entry.y <= 31 &&
    (side === "west" && entry.x === 0 || side === "east" && entry.x === 31 || side === "north" && entry.y === 0 || side === "south" && entry.y === 31);
}
function cleanRetreat(r) {
  if (!r || typeof r !== "object" || !r.home) return null;
  if (typeof r.home.dungeon === "string") return { home: { dungeon: r.home.dungeon, found: !!r.home.found }, side: null, legs: 0 }; // release 249: a retreat inside a dungeon
  if (!Number.isInteger(r.home.rx) || !Number.isInteger(r.home.ry)) return null;
  return { home: { rx: r.home.rx, ry: r.home.ry, found: !!r.home.found }, side: Object.hasOwn(OPPOSITE, r.side) ? r.side : null, legs: Math.max(0, Math.floor(Number(r.legs) || 0)), ...(validRetreatEntry(r.entry, r.side) ? { entry: { x: r.entry.x, y: r.entry.y } } : {}), ...(validRetreatVitals(r.vitals) ? { vitals: { hp: r.vitals.hp, maxHp: r.vitals.maxHp, damage: r.vitals.damage } } : {}) };
}
// A retreating beast's spawn: it comes in by the gate on its entry side (or stands mid-section, where it fled from).
function fleeSpawn(save, here, rx, ry) {
  const q = save.worldBeasts[here], r = q.active.retreat, side = r.side, ex = sectionExits(save.seed, rx, ry), at = here === "voidWalker" && validRetreatEntry(r.entry, side) ? r.entry : side === "east" ? { x: 31 - RETREAT.inset, y: ex.east } : side === "west" ? { x: RETREAT.inset, y: ex.west } : side === "south" ? { x: ex.south, y: 31 - RETREAT.inset } : side === "north" ? { x: ex.north, y: RETREAT.inset } : { x: 15.5, y: 15.5 };
  return { id: `world-beast:${here}:${q.cycle}${here === "voidWalker" && !r.legs ? "" : `:flee:${r.legs}`}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, retreating: true, ...(here === "voidWalker" && validRetreatVitals(r.vitals) ? { retreatVitals: { ...r.vitals } } : {}), traits: [] };
}
// Called once per overworld section load. Returns the spawn of the beast holding this section, or null. One beast holds
// a section at a time, and never one the Questing Beast holds.
export function worldBeastFor(save, map, rx, ry) {
  ensureWorldBeasts(save, false);
  if (!map) return null;
  if (map.settlement || map.tiles?.length !== 1024) { const id = WORLD_BEAST_IDS.find((k) => { const a = save.worldBeasts[k].active; return a?.retreat && a.rx === rx && a.ry === ry; }); return id ? fleeSpawn(save, id, rx, ry) : null; } // release 241: fleeing, it passes through a settlement too
  const qb = save.questingBeast?.active, held = qb && qb.rx === rx && qb.ry === ry;
  let here = WORLD_BEAST_IDS.find((id) => { const a = save.worldBeasts[id].active; return a && a.rx === rx && a.ry === ry; });
  for (const id of WORLD_BEAST_IDS) { // cooldowns run down as sections are entered, and a free beast may claim this one
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (q.active) continue;
    if (q.cooldown > 0) { q.cooldown--; continue; }
    if (here || held || Math.abs(rx) + Math.abs(ry) < B.minDepth) continue;
    if ((hashSeed(`${save.seed}:world-beast:${id}:v1:${q.cycle}:${rx}:${ry}`) % 1000) / 1000 >= B.chance) continue;
    q.active = { rx, ry, tries: 0 }; here = id;
  }
  if (!here) return null;
  const q = save.worldBeasts[here];
  if (q.active.retreat) return fleeSpawn(save, here, rx, ry);
  const marine = here === "voidWalker" || here === "psychicCrystal";
  const open = map.tiles.filter((t) => (marine && marineTileOpen(t) || !t.blocked && !t.structure && !t.environment && !LETHAL_KINDS.has(t.kind)) && t.x > 7 && t.y > 7 && t.x < 24 && t.y < 24);
  const at = open.sort((a, b) => hashSeed(`wb:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wb:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) { if (!q.active.tries) q.active = null; return null; } // no valid terrain for this beast: it does not hold the section
  return { id: `world-beast:${here}:${q.cycle}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, traits: [] };
}
export function worldBeastTriesLeft(save, id) { return WORLD_BEASTS[id].tries - (save.worldBeasts?.[id]?.active?.tries || 0); }

// Provisional follow-on balance: level is a strength floor, never a spawn gate.
export const BEAST_BASELINE = { level: 8, starterHit: 16, starterHp: 102, starterGuard: .025, damageFloor: 60, questingDominance: 1.15 };
export function beastTuningReference(save, stats = {}) {
  const actualLevel = Math.max(1, Number(save.level) || 1), level = Math.max(BEAST_BASELINE.level, actualLevel);
  const weapon = save.equipment?.[save.activeWeaponSlot], levelBonus = Math.floor((level - 1) * .6) - Math.floor((actualLevel - 1) * .6);
  return { level, perHit: Math.max(BEAST_BASELINE.starterHit, (Number(weapon?.power) || 6) + (Number(stats.meleeBonus) || 0) + levelBonus),
    maxHp: Math.max(BEAST_BASELINE.starterHp, (Number(save.maxHp) || 60) + (level - actualLevel) * 6),
    guard: Math.max(BEAST_BASELINE.starterGuard, Math.min(.75, Number(stats.damageReduction) || 0)) };
}
export function beastProfileVitals(profile, save, stats = {}) {
  const r = beastTuningReference(save, stats);
  return { hp: Math.round(r.perHit * profile.hitsToKill + profile.hpPerLevel * r.level),
    damage: Math.max(Math.ceil(BEAST_BASELINE.damageFloor / (1 - r.guard)), Math.round(r.maxHp * profile.damageShare / (1 - r.guard))) };
}

// Tunes a created combatant to the Wayfarer, as the Questing Beast is tuned.
export function tuneWorldBeast(c, save, id, stats = {}) {
  const B = WORLD_BEASTS[id]; if (!B) return c;
  const v = beastProfileVitals(B, save, stats), hp = Math.max(Number(c.maxHp) || 0, v.hp), damage = Math.max(Number(c.damage) || 0, v.damage);
  Object.assign(c, { worldBeast: id, boss: true, hp, maxHp: hp, damage, beastTuningVersion: 1, staggerResistance: B.staggerResistance, speedMultiplier: B.speed, attackGap: B.attackGap, evasive: true });
  return c;
}
// The beast falls: pay its bounty and start its cooldown.
export function worldBeastSlain(save, id) {
  ensureWorldBeasts(save, false); const B = WORLD_BEASTS[id], q = save.worldBeasts[id], marks = B.rewardMarks + B.rewardPerLevel * (Number(save.level) || 1);
  save.currency = (Number(save.currency) || 0) + marks;
  q.slain++; q.cycle++; q.active = null; q.cooldown = B.cooldownSlain;
  return { marks, message: `${B.slain} +${marks} marks.` };
}
// The Wayfarer fell in a beast's section while it lived. Returns a message, or null.
export function worldBeastPlayerFell(save, rx, ry, aliveIds, dungeonId = null) {
  ensureWorldBeasts(save, false);
  const notes = [];
  for (const id of WORLD_BEAST_IDS) {
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (!aliveIds.includes(id) || !q.active || q.active.retreat || (q.active.dungeon ? q.active.dungeon !== dungeonId : q.active.rx !== rx || q.active.ry !== ry)) continue; // a retreating beast takes no tries
    q.active.tries++;
    if (q.active.tries < B.tries) { const left = B.tries - q.active.tries; notes.push(`${B.name} still holds ${q.active.dungeon ? "that place" : `${rx},${ry}`}. ${left} ${left === 1 ? "try remains" : "tries remain"}.`); continue; }
    q.escaped++; q.cycle++; q.active = null; q.cooldown = B.cooldownEscaped;
    notes.push(B.gone);
  }
  return notes.length ? notes.join(" ") : null;
}
// Release 249: a beast that haunts dungeons (the Psychic Crystal, `dungeonChance`) may claim a dungeon with water in it on
// entry, and is there whenever that dungeon is loaded until the hunt ends. Returns its spawn, or null.
export function worldBeastForDungeon(save, map, dungeonId) {
  ensureWorldBeasts(save, false);
  if (!map?.tiles || !dungeonId) return null;
  const ids = WORLD_BEAST_IDS.filter((k) => WORLD_BEASTS[k].dungeonChance), water = map.tiles.filter((t) => t.kind === "dungeonWater");
  let here = ids.find((k) => save.worldBeasts[k].active?.dungeon === dungeonId);
  const coords = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(dungeonId), depth = coords ? Math.abs(Number(coords[1])) + Math.abs(Number(coords[2])) : -1; // ordinary dungeons only (not the story dungeon, arenas, hunts or runs)
  if (!here && depth >= 0) for (const k of ids) {
    const q = save.worldBeasts[k], B = WORLD_BEASTS[k];
    if (q.active || q.cooldown > 0 || depth < B.minDepth || (Number(save.level) || 1) < (B.dungeonMinLevel || 1) || (k === "psychicCrystal" && !water.length)) continue;
    if ((hashSeed(`${save.seed}:world-beast-dungeon:${k}:v1:${q.cycle}:${dungeonId}`) % 1000) / 1000 >= WORLD_BEASTS[k].dungeonChance) continue;
    q.active = { dungeon: dungeonId, tries: 0 }; here = k; break;
  }
  if (!here) return null;
  const q = save.worldBeasts[here], entry = map.entry || { x: 4, y: 5 }, width = Number(map.width) || 32;
  if (here === "voidWalker") {
    const level = map.levelId || "root";
    q.active.dungeonLevel ??= level; // one physical Walker, not a fresh-health copy on every dungeon floor
    if (q.active.dungeonLevel !== level) return null; // an unfinished retreat remains on its source floor for revisit
  }
  const near = (t) => water.some((w) => Math.abs(w.x - t.x) + Math.abs(w.y - t.y) <= 4);
  const reachable = here === "voidWalker" ? walkerReachableTiles(map, entry) : null;
  const spots = map.tiles.filter((t) => (!reachable || reachable.has(t.y * width + t.x)) && !t.blocked && !LETHAL_KINDS.has(t.kind) && t.kind !== "dungeonWater" && t.x > 1 && t.y > 1 && t.x < width - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 7);
  const pool = here === "psychicCrystal" && spots.filter(near).length ? spots.filter(near) : spots, at = pool.sort((a, b) => hashSeed(`wbd:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wbd:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) { if (!q.active.tries && !q.active.retreat) q.active = null; return null; }
  return { id: `world-beast:${here}:${q.cycle}${q.active.retreat && here !== "voidWalker" ? ":flee" : ""}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, retreating: !!q.active.retreat, inDungeon: true, traits: [] };
}
// A load-time, finite floor graph used only to keep ground Walker spawns and teleport landings in the
// entrance component. This does not grant phasing, generate terrain, or change any player position.
export function walkerReachableTiles(map, origin = map?.entry) {
  const width = Number(map?.width) || 32, height = Math.floor((map?.tiles?.length || 0) / width), seen = new Set();
  if (!Number.isInteger(width) || width < 1 || !origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y) || width * height > 65536) return seen;
  const sx = Math.round(origin.x), sy = Math.round(origin.y), body = { isPlayer: false, flying: false, phases: false };
  const open = (x, y) => { const t = map.tiles[y * width + x]; return x >= 0 && y >= 0 && x < width && y < height && t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !["river", "dungeonWater", "abyss", "lava", "canyon"].includes(t.kind) && !["districtWall", "shackWall"].includes(t.structure); };
  if (!open(sx, sy)) return seen;
  const queue = [{ x: sx, y: sy }]; seen.add(sy * width + sx);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = p.x + dx, y = p.y + dy, k = y * width + x;
      if (seen.has(k) || !open(x, y) || !canStep(body, map, width, p.x, p.y, x, y) || !canStep(body, map, width, x, y, p.x, p.y)) continue;
      seen.add(k); queue.push({ x, y });
    }
  }
  return seen;
}
// A retreat inside a dungeon: the Crystal seeks water; the Walker seeks a reachable dungeon doorway.
export function beginDungeonRetreat(save, id, map) {
  ensureWorldBeasts(save, false); const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
  q.active.retreat = { home: { dungeon: q.active.dungeon, found: id === "voidWalker" ? walkerRetreatDoors(map).length > 0 : (map?.tiles || []).some((t) => t.kind === "dungeonWater") }, side: null, legs: 0 };
  return { message: B.fleeDungeon || B.flee, home: q.active.retreat.home };
}
// Sections held by a beast, for the Atlas's danger marks.
export function worldBeastsHeld(save) { return WORLD_BEAST_IDS.map((id) => ({ id, name: WORLD_BEASTS[id].name, ...save.worldBeasts?.[id]?.active })).filter((q) => Number.isInteger(q.rx)); }

// Void Walker terrain, additive at save schema 14. The base/pinned generator is never edited. A scar belongs to
// the exact areaStateId (including a level suffix), not to a beast's temporary hunt or a shared dungeon family.
// Every in-bounds tile in the disk is consumed, including gates, building walls and outer edge tiles. Quest/object
// state is separate: destroying their physical terrain never completes, opens, discovers or deletes those objects.
// History has no area-count or scar-count eviction limit. Collision cells are bounded by actual map geometry.
// Exact continuous visual circles retain their cast-center projection lift. Duplicate and contained circles are
// removed, never approximated/evicted; distinct noncontained boundaries can still grow indefinitely. Runtime casts/replays normalize only this area.
// Saving the whole journey is ultimately subject to the storage backend's capacity/error handling.
export const VOID_SCARS = Object.freeze({ schema: 1, maxRadius: 32, maxRegionCells: 4096, maxDimension: 256, maxMapCells: 65536, maxElevation: 5 });
const VOID_NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const voidRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const voidAreaKey = (key) => typeof key === 'string' && /^(dungeon|overworld):/.test(key) && key.length <= 1024;
const voidDimensions = (width, height) => Number.isInteger(width) && Number.isInteger(height) && width >= 3 && height >= 3 && width <= VOID_SCARS.maxDimension && height <= VOID_SCARS.maxDimension && width * height <= VOID_SCARS.maxMapCells;
const voidElevation = (value) => Number.isFinite(value) && value >= 0 && value <= VOID_SCARS.maxElevation;
const voidHeight = (tile) => voidElevation(tile?.elev) ? tile.elev : 0;
function voidCell(value, width, height) {
  if (typeof value !== 'string' || value.length > 15 || !/^\d+,\d+$/.test(value)) return null;
  const [x, y] = value.split(',').map(Number);
  return Number.isSafeInteger(x) && Number.isSafeInteger(y) && x < width && y < height ? `${x},${y}` : null;
}
const voidCircleOrder = (a, b) => a.x - b.x || a.y - b.y || a.radius - b.radius || (a.visualLift || 0) - (b.visualLift || 0);
const voidCircle = (value, width, height) => voidRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.radius) && value.x >= 0 && value.y >= 0 && value.x < width && value.y < height && value.radius > 0 && value.radius <= VOID_SCARS.maxRadius && (value.visualLift === undefined || Number.isFinite(value.visualLift) && Math.abs(value.visualLift) <= VOID_SCARS.maxElevation);
function voidCircles(circles, width, height) {
  const unique = new Map();
  // Enumerate actual entries, not a malformed sparse array's potentially enormous declared length.
  for (const key of Object.keys(circles)) { const c = circles[key]; if (voidCircle(c, width, height)) unique.set(`${c.x},${c.y},${c.radius},${c.visualLift || 0}`, { ...c }); }
  return [...unique.values()].sort(voidCircleOrder);
}
const voidCircleContains = (a, b) => (a.visualLift || 0) === (b.visualLift || 0) && Math.hypot(a.x - b.x, a.y - b.y) + b.radius <= a.radius;
const voidCellOrder = (a, b) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return ay - by || ax - bx; };
// This is an input-shape guard, not a history quota: no generated record can contain more cells than the largest
// supported map. Oversized malformed/imported arrays stay intact and inert, never truncated to lose old history.
const voidCellArray = (value) => Array.isArray(value) && value.length <= VOID_SCARS.maxMapCells;
function voidNormalizeArea(row) {
  if (!voidRecord(row) || !voidDimensions(row.width, row.height) || !voidCellArray(row.cells)) return row;
  const cells = [...new Set(row.cells.map((p) => voidCell(p, row.width, row.height)).filter(Boolean))].sort(voidCellOrder), next = { ...row, cells };
  if (voidRecord(row.elevations)) {
    const elevations = {};
    for (const p of cells) if (Object.hasOwn(row.elevations, p) && voidElevation(row.elevations[p])) elevations[p] = row.elevations[p];
    next.elevations = elevations;
  }
  if (Array.isArray(row.circles)) next.circles = voidCircles(row.circles, row.width, row.height);
  if (voidCellArray(row.legacyCells)) {
    const recorded = new Set(cells);
    next.legacyCells = [...new Set(row.legacyCells.map((p) => voidCell(p, row.width, row.height)).filter((p) => recorded.has(p)))].sort(voidCellOrder);
  }
  if (voidCellArray(row.slopes)) {
    const recorded = new Set(cells);
    next.slopes = [...new Set(row.slopes.map((p) => voidCell(p, row.width, row.height)).filter((p) => recorded.has(p)))].sort(voidCellOrder);
  }
  return next;
}
// Called without an area key by freshSave/migrateSave; optional current-area normalization keeps a cast/replay
// independent of the number of other scarred sections. Unknown root/area fields and future schema records survive.
export function ensureVoidScars(save, areaKey) {
  const source = voidRecord(save.voidScars) ? save.voidScars : {}, areas = voidRecord(source.areas) ? source.areas : {};
  if (source.schema !== undefined && source.schema !== VOID_SCARS.schema) return save;
  const keys = areaKey === undefined ? Object.keys(areas) : Object.hasOwn(areas, areaKey) ? [areaKey] : [];
  for (const key of keys) Object.defineProperty(areas, key, { value: voidNormalizeArea(areas[key]), enumerable: true, writable: true, configurable: true });
  save.voidScars = { ...source, schema: VOID_SCARS.schema, areas };
  return save;
}
function voidGeometry(map, areaKey) {
  // Overworld generators intentionally omit width/height; their established section contract is 32 by 32.
  const width = map?.width ?? (areaKey.startsWith('overworld:') && map?.tiles?.length === 1024 ? 32 : 0), height = map?.height ?? (Array.isArray(map?.tiles) ? map.tiles.length / width : 0);
  if (!voidDimensions(width, height) || !Array.isArray(map.tiles) || map.tiles.length !== width * height) return null;
  for (let i = 0; i < map.tiles.length; i++) if (!voidRecord(map.tiles[i])) return null;
  return { width, height };
}
const voidSafe = (tile) => !!tile && !tile.blocked && tile.kind !== 'void' && tile.kind !== 'sealedGate' && !LETHAL_KINDS.has(tile.kind) && !tile.pit && !(/Wall$/.test(tile.structure || '') && tile.wallSides?.length);
function voidNeighbours(i, width, height, visit) {
  const x = i % width, y = Math.floor(i / width);
  for (const [dx, dy] of VOID_NEIGHBOURS) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < width && ny < height) visit(ny * width + nx); }
}
// Preserve every existing safe floor's height. Consumed walls/pits copy the nearest safe floor's elevation through
// a deterministic, map-bounded multi-source search (row-major tie break). With no safe floor, use level zero.
// The shared scar-edge traversal rule handles steep new joins without changing any non-scar cliff or lethal tile.
function voidFloorHeights(map, width, height) {
  const elevations = new Float64Array(map.tiles.length), seen = new Uint8Array(map.tiles.length), queue = [];
  for (let i = 0; i < map.tiles.length; i++) if (voidSafe(map.tiles[i])) { elevations[i] = voidHeight(map.tiles[i]); seen[i] = 1; queue.push(i); }
  for (let q = 0; q < queue.length; q++) voidNeighbours(queue[q], width, height, (n) => { if (!seen[n]) { seen[n] = 1; elevations[n] = elevations[queue[q]]; queue.push(n); } });
  return elevations;
}
const voidResult = (ok, reason = null, cells = [], visualChanged = false) => ({ ok, reason, changed: cells.length, visualChanged, cells, protected: [], rejected: [] });
function voidTile(areaKey, width, i, elevation = 0, slope = false) {
  const x = i % width, y = Math.floor(i / width);
  // Do not spread the old wall: environment, pit, structure, gate and collision metadata must not survive.
  return { x, y, kind: 'voidScar', blocked: false, elev: elevation, slope, voidScar: true, detail: hashSeed(`void-scar:v1:${areaKey}:${x},${y}`) % 4 };
}
function voidInstall(map, areaKey, width, indices, row) {
  // Runtime metadata is detached from saved records; rendering never mutates persistent geometry.
  map._voidScarCircles = (row.circles || []).map((c) => ({ ...c }));
  map._voidScarLegacyCells = [...(row.legacyCells || (row.circles?.length ? [] : row.cells))];
  const changed = [], slopes = new Set(row.slopes || []);
  for (const i of indices) {
    const key = `${i % width},${Math.floor(i / width)}`, elevation = row.elevations?.[key] ?? row.elevation;
    const next = voidTile(areaKey, width, i, elevation, slopes.has(key)), old = map.tiles[i];
    if (old && Object.keys(old).length === Object.keys(next).length && Object.keys(next).every((k) => old[k] === next[k])) continue;
    map.tiles[i] = next; changed.push(key);
  }
  return changed;
}
function voidStoredArea(save, areaKey, dimensions) {
  if (save.voidScars?.schema !== VOID_SCARS.schema || !voidRecord(save.voidScars?.areas)) return { error: 'unsupported-schema' };
  const row = Object.hasOwn(save.voidScars.areas, areaKey) ? save.voidScars.areas[areaKey] : undefined;
  if (row === undefined) return { row: null };
  if (!voidRecord(row) || !voidCellArray(row.cells) || row.elevations !== undefined && !voidRecord(row.elevations) || row.slopes !== undefined && !voidCellArray(row.slopes) || row.circles !== undefined && !Array.isArray(row.circles) || row.legacyCells !== undefined && !voidCellArray(row.legacyCells)) return { error: 'invalid-record' };
  if (row.width !== dimensions.width || row.height !== dimensions.height || row.elevation !== 0) return { error: 'geometry-mismatch' };
  return { row };
}
// `center` is the exact world-space rendered center (Game supplies effect.x + .5, effect.y + .62).
// Optional center.visualLift pins the cast projection; legacy/direct-helper circles default to zero lift.
// Convert every in-bounds tile square intersected by the disk, excluding tangent-only contact. Collision is tile
// based; only the visual white/red union is continuous. Outside-disk portions of intersected tiles render ordinary
// safe floor, not false remaining walls. Floor repaint and pit neutralization are durable too. The compatibility
// `actors` argument is never read or mutated: terrain is separate from actor/object/reward/inventory/discovery state. Existing scars, including their heights, are immutable history.
export function consumeVoidTerrain(save, map, areaKey, center, radius, actors = []) {
  if (!voidAreaKey(areaKey)) return voidResult(false, 'unsupported-area');
  const dimensions = voidGeometry(map, areaKey); if (!dimensions) return voidResult(false, 'unsupported-area');
  if (!Number.isFinite(center?.x) || !Number.isFinite(center?.y) || !Number.isFinite(radius) || radius <= 0 || radius > VOID_SCARS.maxRadius || center.x < 0 || center.y < 0 || center.x >= dimensions.width || center.y >= dimensions.height || center.visualLift !== undefined && (!Number.isFinite(center.visualLift) || Math.abs(center.visualLift) > VOID_SCARS.maxElevation) || !Array.isArray(actors)) return voidResult(false, 'invalid-region');
  ensureVoidScars(save, areaKey);
  const stored = voidStoredArea(save, areaKey, dimensions); if (stored.error) return voidResult(false, stored.error);
  const { width, height } = dimensions, candidates = [];
  for (let y = Math.max(0, Math.floor(center.y - radius)); y <= Math.min(height - 1, Math.floor(center.y + radius)); y++) for (let x = Math.max(0, Math.floor(center.x - radius)); x <= Math.min(width - 1, Math.floor(center.x + radius)); x++) {
    const dx = Math.max(x - center.x, 0, center.x - x - 1), dy = Math.max(y - center.y, 0, center.y - y - 1);
    if (Math.hypot(dx, dy) >= radius || isMarineTile(map.tiles[y * width + x])) continue;
    candidates.push(y * width + x);
    if (candidates.length > VOID_SCARS.maxRegionCells) return voidResult(false, 'region-capacity');
  }
  // A marine-only blast still deals damage and plays its transient effects; it has no permanent terrain footprint.
  if (!candidates.length) return voidResult(true);
  const all = new Set(stored.row?.cells || []), elevations = { ...stored.row?.elevations }, slopes = new Set(stored.row?.slopes || []), heights = voidFloorHeights(map, width, height);
  for (const i of candidates) {
    const key = `${i % width},${Math.floor(i / width)}`; if (all.has(key)) continue;
    all.add(key);
    if (heights[i] !== 0) elevations[key] = heights[i];
    if (voidSafe(map.tiles[i]) && map.tiles[i].slope) slopes.add(key);
  }
  const visualLift = center.visualLift ?? 0;
  const circle = { x: center.x, y: center.y, radius, ...(visualLift ? { visualLift } : {}) }, priorCircles = stored.row?.circles || [], visualChanged = !priorCircles.some((c) => voidCircleContains(c, circle));
  const circles = visualChanged ? [...priorCircles.filter((c) => !voidCircleContains(circle, c)), circle].sort(voidCircleOrder) : priorCircles;
  const legacyCells = stored.row?.legacyCells || (priorCircles.length ? [] : stored.row?.cells || []);
  const row = { ...stored.row, width, height, elevation: 0, cells: [...all].sort(voidCellOrder), circles };
  if (legacyCells.length || stored.row?.legacyCells !== undefined) row.legacyCells = [...legacyCells];
  if (Object.keys(elevations).length || stored.row?.elevations !== undefined) row.elevations = elevations;
  if (slopes.size || stored.row?.slopes !== undefined) row.slopes = [...slopes].sort(voidCellOrder);
  if (all.size) save.voidScars.areas[areaKey] = row;
  return voidResult(true, null, voidInstall(map, areaKey, width, candidates, row), visualChanged);
}
// Replay after saved object/deep-progress restoration and before position repair, in both dungeon and overworld.
// Original gates, buildings and later occupants cannot restore consumed collision or veto its permanent scar.
export function applyVoidScars(save, map, areaKey) {
  if (!voidAreaKey(areaKey)) return voidResult(false, 'unsupported-area');
  const dimensions = voidGeometry(map, areaKey); if (!dimensions) return voidResult(false, 'unsupported-area');
  ensureVoidScars(save, areaKey);
  const stored = voidStoredArea(save, areaKey, dimensions); if (stored.error) return voidResult(false, stored.error);
  if (!stored.row) { map._voidScarCircles = []; map._voidScarLegacyCells = []; return voidResult(true); }
  const { width, height } = dimensions, candidates = [];
  for (const key of stored.row.cells) {
    const clean = voidCell(key, width, height); if (!clean) return voidResult(false, 'invalid-record');
    const [x, y] = clean.split(',').map(Number); if (!isMarineTile(map.tiles[y * width + x])) candidates.push(y * width + x);
  }
  return voidResult(true, null, voidInstall(map, areaKey, width, candidates, stored.row));
}
