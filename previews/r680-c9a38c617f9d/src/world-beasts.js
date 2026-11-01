import { mealLure } from "./meals.js?v=r680-c9a38c617f9d";
import { ASTRAL_PROFILE } from "./astral-worm.js?v=r680-c9a38c617f9d";
// World beasts (release 235; Tim, 2026-10-19: "more monsters similar to the Questing Beast … strong … varied moves and
// attacks … hyper-aggressive … crazy amounts of health … roaming world bosses … you still get three tries" (four since release 307: "4 tries... is fair"). Each one
// works the way the Questing Beast does (src/questing-beast.ts, which is left as it was): now and then it claims a wild
// section; it stays until it is killed or it has killed the Wayfarer `tries` times; then it is gone, and after a
// cooldown counted in sections entered a new hunt can begin somewhere else. Its health and blows are tuned to the
// Wayfarer's power. The creature itself (body, attacks, brain) is a Monster Pack entry; this module holds only the hunt.
import { hashSeed } from "./random.js?v=r680-c9a38c617f9d";
import { LETHAL_KINDS, canStep } from "./landscape.js?v=r680-c9a38c617f9d";
import { sectionExits, apertureTier } from "./world.js?v=r680-c9a38c617f9d";
import { stageOneBeastReference } from "./stages.js?v=r680-c9a38c617f9d";

// One row per beast. `kind` is its MONSTER_PACK id. Balance lives here.
export const WORLD_BEASTS = {
  morphingBlob: {
    kind: "morphingBlob", name: "The Morphing Blob", chance: .03, minDepth: 5, tries: 4, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 70, hpPerLevel: 30, damageShare: .22, speed: 1, attackGap: .18, staggerResistance: .95, rewardMarks: 170, rewardPerLevel: 17,
    patience: 180, home: "mire", retreatMoves: "walk",
    flee: "The Morphing Blob has had enough of you. It pulls itself together and flows away toward the Blight Mire.",
    homeLine: "The Morphing Blob slides into the toxic pools of the mire and is gone.",
    arrive: "Something wet and enormous has settled over this ground. The Morphing Blob is here.",
    slain: "The Morphing Blob shudders, sags and runs away into the soil.",
    gone: "The Morphing Blob has fed enough on you, and seeps away. In time it will settle somewhere else.",
  },
  tremorWorm: {
    kind: "tremorWorm", name: "The Tremor Worm", chance: .03, minDepth: 5, tries: 4, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 62, hpPerLevel: 28, damageShare: .22, speed: 1, attackGap: .2, staggerResistance: .95, rewardMarks: 175, rewardPerLevel: 17,
    patience: 180, home: "dunes", retreatMoves: "burrow",
    flee: "The Tremor Worm dives and swims away under the ground, toward the Dune Sea.",
    homeLine: "The Tremor Worm's wake reaches the dunes and sinks into the sand.",
    arrive: "The ground here trembles under your feet. The Tremor Worm is hunting.",
    slain: "The Tremor Worm thrashes, sinks, and the ground stops shaking.",
    gone: "The Tremor Worm has had its fill of you, and sinks away. In time it will surface somewhere else.",
  },
  mountainTurtle: {
    kind: "mountainTurtle", name: "The Mountain Turtle", chance: .025, minDepth: 6, tries: 4, cooldownSlain: 22, cooldownEscaped: 28,
    hitsToKill: 78, hpPerLevel: 34, damageShare: .24, speed: 1, attackGap: .35, staggerResistance: 1, rewardMarks: 190, rewardPerLevel: 19,
    patience: 180, home: "canyon", retreatMoves: "through",
    flee: "The Mountain Turtle turns its great head away and walks off toward the canyons, through whatever stands in its way.",
    homeLine: "The Mountain Turtle steps over the canyon's edge and climbs down out of sight.",
    arrive: "The ground shakes with slow, enormous footsteps. The Mountain Turtle walks here.",
    slain: "The Mountain Turtle sinks to its knees, and its shell settles like a tomb.",
    gone: "The Mountain Turtle has trampled you enough, and walks on. In time it will settle somewhere else.",
  },
  nanobotKnight: {
    kind: "nanobotKnight", name: "The Nanobot Knight", chance: .025, minDepth: 6, tries: 4, cooldownSlain: 22, cooldownEscaped: 28,
    hitsToKill: 60, hpPerLevel: 28, damageShare: .22, speed: 1.1, attackGap: .22, staggerResistance: .95, rewardMarks: 190, rewardPerLevel: 19,
    patience: 180, home: "glass", retreatMoves: "through",
    flee: "The Nanobot Knight comes apart into a red-black swarm and streams away toward the glass.",
    homeLine: "The swarm settles into the glass and soaks into it like water into sand.",
    arrive: "Something black and red stands very still here, and the air hums. The Nanobot Knight is waiting.",
    slain: "The Nanobot Knight's armour falls empty, and the swarm inside it goes dark.",
    gone: "The Nanobot Knight has learned you, and drifts apart. In time it will gather somewhere else.",
  },
  // Release 257 (Tim 2026-10-21): a giant lightning robot. It retreats on foot to a chasm, where a storm cloud gathers
  // under it and carries it up into the sky.
  lightningGiant: {
    kind: "lightningGiant", name: "The Lightning Giant", chance: .025, minDepth: 6, tries: 4, cooldownSlain: 22, cooldownEscaped: 28,
    hitsToKill: 72, hpPerLevel: 32, damageShare: .24, speed: .65, attackGap: .3, staggerResistance: 1, rewardMarks: 190, rewardPerLevel: 19,
    patience: 180, home: "canyon", retreatMoves: "walk",
    flee: "The Lightning Giant lowers its club and strides away toward the chasms, sparks trailing from its coils.",
    homeLine: "At the chasm's edge a storm cloud gathers under the Lightning Giant, and it rides the cloud up into the sky.",
    arrive: "The air smells of a storm, and the ground shakes with heavy, measured steps. The Lightning Giant walks here.",
    slain: "The Lightning Giant's coils spit and go dark, and it falls like a felled tower.",
    gone: "The Lightning Giant has had enough of you, and strides off into the weather. In time it will walk somewhere else.",
  },
  psychicCrystal: {
    kind: "psychicCrystal", name: "The Psychic Crystal", chance: .025, minDepth: 5, tries: 4, cooldownSlain: 20, cooldownEscaped: 26,
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
    kind: "voidWalker", name: "The Void Walker", chance: .025, minDepth: 5, tries: 4, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 60, hpPerLevel: 28, damageShare: .2, speed: 1.1, attackGap: 1.1, /* release 407 (Tim: "the Void Walker should attack less frequently... it covers up the entire screen with attacks... a little bit more pacing"): was .3 */ staggerResistance: .9, rewardMarks: 180, rewardPerLevel: 18,
    patience: 180, home: "dungeon", retreatMoves: "walk", dungeonChance: 0, dungeonMinLevel: 1, // release 429 (Tim: "I shouldn't be meeting him in the dungeons, because he makes kind of a big mess... floating... through blocks"): no new dungeon hunts (was .3); one already under way finishes where it is
    flee: "The Void Walker folds its rends shut and leaves toward a dungeon entrance.",
    fleeDungeon: "The Void Walker closes its constellation and heads for the nearest reachable dungeon door.",
    homeLine: "The Void Walker passes through the dungeon door and is gone.",
    arrive: "A figure your own size stands beneath a tear of violet stars. The Void Walker is here.",
    arriveDungeon: "Violet starlight moves through the halls. The Void Walker roams this place.",
    slain: "The Void Walker's silhouette unravels into a scattering of stars.",
    gone: "The Void Walker closes its hunt. In time, another rend will open.",
  },
  astralWorm: ASTRAL_PROFILE,
};
export const WORLD_BEAST_IDS = Object.keys(WORLD_BEASTS);
// One exact shared marine classification for encounter placement, movement, attack variants and scars.
// Lake, river, swamp, dungeon water and shallows retain their existing behavior.
export const isMarineTile = (tile) => tile?.kind === "ocean" || tile?.kind === "deepOcean";
const astralSpawnWater = tile => ['ocean','deepOcean','lakeWater','river','dungeonWater','shallows','swampWater','mireWater','toxicWater'].includes(tile?.kind) && !tile.structure && !tile.buildingId && !tile.environment && !tile.pit;
export const marineTileOpen = (tile) => isMarineTile(tile) && !tile.structure && !tile.buildingId && !tile.environment && !tile.pit;

// Release 239 (Tim, 2026-10-20): a beast that has neither killed the Wayfarer nor died within its `patience` (seconds of
// fighting in its section) gives up and retreats home: invulnerable, finding its way across the land (see RETREAT_GROUND),
// section after section, until it reaches its home ground and goes into it. The Wayfarer can follow and watch;
// stop following and it is gone. Homes: a section that has one (`section`), and in it the ground it goes into (`tile`,
// or `object`). Later beasts name theirs here too: the Void Walker a dungeon, the Psychic Crystal water, the Mountain
// Turtle a canyon, the Nanobot Knight glass.
export const BEAST_HOMES = {
  wayglass: { name: "the nearest reachable Wayglass" },
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
// Encounter pacing (release 261; Tim, 2026-10-21: "these world bosses should be more rare... if you meet a world boss, it
// shouldn't be another world boss for... 8 tiles"). Every spawn chance (world beasts and the Questing Beast) is scaled by
// `chanceScale`, and after meeting one, no new one is claimed until the buffer is full again.
// Release 263 (Tim: "8 consecutively different tiles. They don't have to be completely new... If you go back into one of
// the tiles, the counter won't increase, but it won't decrease either"): a section counts when it is not among the last
// `newSections` different sections entered (`recent`), whether or not it was ever visited before.
// save.beastGap = { fresh, recent } (additive; a save without it starts ready).
// Release 349 (Tim, 2026-10-23: "make... the world bosses just slightly more... frequent, so I can see a few more of them"):
// the gap between meetings goes from 8 new sections to 6, and every beast's section chance from half its base to 70%.
export const ENCOUNTER = { newSections: 6, chanceScale: .7 };
export function ensureBeastGap(save) {
  const g = save.beastGap && typeof save.beastGap === "object" ? save.beastGap : {}, n = Number(g.fresh);
  const recent = (Array.isArray(g.recent) ? g.recent : []).filter((k, i, a) => typeof k === "string" && a.indexOf(k) === i).slice(-ENCOUNTER.newSections);
  save.beastGap = { ...g, fresh: Number.isFinite(n) ? Math.max(0, Math.min(ENCOUNTER.newSections, Math.floor(n))) : ENCOUNTER.newSections, recent };
  return save.beastGap;
}
// Called once per overworld section load (`key` is "rx,ry"), before any beast is placed.
export function noteSectionVisit(save, key) {
  const g = ensureBeastGap(save); key = String(key);
  if (g.recent.includes(key)) return g.fresh;
  g.recent.push(key); if (g.recent.length > ENCOUNTER.newSections) g.recent.shift();
  g.fresh = Math.min(ENCOUNTER.newSections, g.fresh + 1); return g.fresh;
}
// Release 447: a Bloodmoss meal (meals.ts) shortens the buffer and raises every section chance while it lasts.
export const encounterReady = (save) => ensureBeastGap(save).fresh >= Math.ceil(ENCOUNTER.newSections * mealLure(save).gap);
export const encounterChance = (save) => ENCOUNTER.chanceScale * mealLure(save).chance;
export function encounterMet(save) { ensureBeastGap(save).fresh = 0; }
export const RETREAT = { search: 8, fallback: 6, speed: 2.1, inset: 1.5, fade: 1.4, lose: 3, legSeconds: 30, homeLinger: 120, wormLinger: 240 }; // release 653: legSeconds 14 → 30 (a section takes about 13 s to cross); wormLinger: an unfollowed Worm retreat ends
// Release 605 (Tim, 2026-10-31: "when the world bosses are in retreat [you] should be able to follow them across multiple tiles.
// Right now, you can only see them in one tile... They should be going to a place where they can retreat"): a retreat is no
// longer lost the moment the Wayfarer loads another section. Out of sight, the beast keeps walking home, one section every
// `legSeconds` of play (save.playSeconds), and waits in its home section `homeLinger` s before going in. It escapes only when
// the Wayfarer is more than `lose` sections from it (or goes into a dungeon). game.ts pins it on the Atlas and leaves tracks.
// Pursuit (release 259; Tim, 2026-10-21: "they should pursue you out of the tile that you meet them... The blob can just
// take one", then "three tiles max... it'll chase you 2 tiles, and then it'll stop there and then it'll chase you 1 more...
// If you don't wanna fight it within three tiles, you're obviously running away"). A fighting world beast follows the
// Wayfarer across a section edge, coming in `inset` tiles inside the gate behind them, `sections` times in all for this
// encounter (per-beast overrides below), however the crossings are spread out; then it stays where it is. Its patience
// keeps counting the whole time. The Void Walker and the Astral Worm keep their own section rules and do not pursue.
export const PURSUIT = { sections: 3, inset: 3.5, limits: { morphingBlob: 1 }, exclude: ["voidWalker", "astralWorm"] };
// The Morphing Blob's retreat (release 259; Tim: "if the blob is at its original size, it will just leave... only if it's
// larger will it shrink and leave a residue"): a Blob grown past its original size by more than `grown` goes home at its
// original size, and the extra mass it leaves stays put, lingers `linger` s and fades out over its last `fade` s. It is
// never saved, so leaving the section clears it. A Blob still at its original size leaves whole.
export const BLOB_SPLIT = { grown: .05, linger: 14, fade: 5 };
const SIDES = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }, OPPOSITE = { east: "west", west: "east", north: "south", south: "north" };

// Release 345 (Tim, 2026-10-23: "set an option... where we can set the death sequence for the world bosses... turn it off... so
// that there's no deaths... if you don't beat the boss... within 3 minutes. He'll just lose patience and then leave. But if you
// do more than 50% of the boss's health, he will extend that 3 minutes by another two minutes"). With tries off (Options →
// Accessibility, settings.beastTries), deaths cost no tries and do not reset the beast; its own `patience` clock runs across
// deaths, and once it is below `below` of its health the clock gains `extend` seconds.
export const BEAST_NO_TRIES = { extend: 120, below: .5 };
// Counts fighting time; true when the beast's patience has just run out. `e` is the live beast (for the extension).
export function worldBeastPatience(save, id, dt, e = null, triesOff = false) {
  const q = save.worldBeasts?.[id]?.active; if (!q || q.retreat) return false;
  // A Walker that joined an Astral fight stays until it is killed or the player's tries run out, unless it chose to leave.
  if (q.astralLeave) return true;
  if (q.astralJoined) return false;
  q.patience = (Number(q.patience) || 0) + dt;
  const extended = triesOff && e && e.hp < (e.maxHp || 1) * BEAST_NO_TRIES.below;
  return q.patience >= WORLD_BEASTS[id].patience + (extended ? BEAST_NO_TRIES.extend : 0);
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
  q.active.retreat = { home: home ? { ...home, found: true } : { rx: rx + away[0] * RETREAT.fallback, ry: ry + away[1] * RETREAT.fallback, found: false }, side: null, legs: 0, movedAt: Number(save.playSeconds) || 0 };
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
  return { x: best ? best.x : (Number(map?.width) || 32) / 2 - .5, y: best ? best.y : Math.floor((map?.tiles?.length || 1024) / (Number(map?.width) || 32)) / 2 - .5, side: null, home: true, ...(r.home.found && H && !best ? { noGround: true } : {}) }; // release 609: a claimed home with none of its ground
}
// Release 609 (Codex play-test, issue 3): the home it chose turned out to hold none of its ground (the section's landscape is laid
// over the bare region the choice looked at). It looks again from here, never at a section already tried, up to `replans` times;
// after that it heads off into the distance (home not found), and says so.
export const RETREAT_REPLAN = { replans: 3 };
export function replanRetreat(save, id, rx, ry, probe) {
  const q = save.worldBeasts?.[id]?.active, r = q?.retreat, B = WORLD_BEASTS[id], H = BEAST_HOMES[B?.home]; if (!r || !H) return { message: "" };
  r.tried = [...new Set([...(r.tried || []), `${rx},${ry}`])]; r.replans = (r.replans || 0) + 1;
  let home = null;
  if (r.replans <= RETREAT_REPLAN.replans) for (let d = 1; d <= RETREAT.search && !home; d++) {
    const ring = []; for (let dx = -d; dx <= d; dx++) for (const dy of new Set([d - Math.abs(dx), -(d - Math.abs(dx))])) ring.push({ rx: rx + dx, ry: ry + dy });
    ring.sort((a, b) => hashSeed(`${save.seed}:beast-home:${id}:${a.rx},${a.ry}`) - hashSeed(`${save.seed}:beast-home:${id}:${b.rx},${b.ry}`));
    home = ring.find((c) => !(c.rx === 0 && c.ry === 0) && !r.tried.includes(`${c.rx},${c.ry}`) && H.section(probe(c.rx, c.ry))) || null;
  }
  const away = Object.values(SIDES)[hashSeed(`${save.seed}:beast-away:${id}:${q.cycle}:${r.replans}`) % 4];
  r.home = home ? { ...home, found: true } : { rx: rx + away[0] * RETREAT.fallback, ry: ry + away[1] * RETREAT.fallback, found: false };
  return { message: home ? `${B.name} finds no ${H.name} here, and turns to look further.` : `${B.name} finds no ${H.name} here, and heads off into the distance.`, home: r.home };
}
// The beast crossed out of a section: it is now in the next one, coming in from the opposite side.
export function retreatCrossed(save, id, side, entry = null, actor = null) {
  const q = save.worldBeasts[id].active, [dx, dy] = SIDES[side];
  q.rx += dx; q.ry += dy; q.retreat.side = OPPOSITE[side]; q.retreat.legs++; q.retreat.movedAt = Number(save.playSeconds) || 0;
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
  for (const id of WORLD_BEAST_IDS) { const a = save.worldBeasts[id].active; if (!a?.retreat || id === "voidWalker") continue;
    if (id === "astralWorm") { // release 653: an unfollowed Worm retreat ends once it has been out of sight `wormLinger` s of play (it used to freeze where it was and block every later Worm hunt)
      if (a.dungeon || area !== "overworld" || !Number.isInteger(a.rx) || !Number.isInteger(a.ry)) continue; // a Worm retreating through a dungeon keeps its own route
      const now = Number(save.playSeconds) || 0, here = a.rx === rx && a.ry === ry;
      // when it was last in sight (on the hunt, never inside its retreat record, which the Worm's own route owns)
      if (here) { a.retreatSeenAt = now; continue; } if (!Number.isFinite(a.retreatSeenAt)) a.retreatSeenAt = now;
      if (now - a.retreatSeenAt >= RETREAT.wormLinger) { retreatEnded(save, id); lost.push(id); }
      continue; }
    if (!a.dungeon && area === "overworld") { advanceRetreat(save, id, rx, ry); if (!save.worldBeasts[id].active) { lost.push(id); continue; } } // release 605
    const b = save.worldBeasts[id].active, far = Math.max(Math.abs(b.rx - rx), Math.abs(b.ry - ry));
    if (b.dungeon ? area !== "dungeon" || dungeonId !== b.dungeon : area !== "overworld" || far > RETREAT.lose) { retreatEnded(save, id); lost.push(id); } }
  return lost;
}
// Release 605: an unseen retreat catches up with the time that passed: one section per RETREAT.legSeconds toward home, then
// RETREAT.homeLinger s waiting there before it goes in (retreatEnded). It never walks into the section the Wayfarer is in:
// it waits at the edge, so arriving there shows it.
export function advanceRetreat(save, id, rx, ry) {
  const q = save.worldBeasts?.[id]?.active, r = q?.retreat; if (!r || q.dungeon) return null;
  const now = Number(save.playSeconds) || 0; if (!Number.isFinite(r.movedAt)) r.movedAt = now;
  let moved = 0;
  for (let i = 0; i < 64; i++) {
    const side = retreatSide(r, q.rx, q.ry);
    if (!side) { if (now - r.movedAt >= RETREAT.homeLinger && (q.rx !== rx || q.ry !== ry)) { retreatEnded(save, id); return { gone: true, moved }; } break; }
    if (now - r.movedAt < RETREAT.legSeconds) break;
    if (q.rx === rx && q.ry === ry) break; // release 653: nor out of the section the Wayfarer is just entering: arriving there shows it
    const [dx, dy] = SIDES[side]; if (q.rx + dx === rx && q.ry + dy === ry) break; // it does not step into the Wayfarer's section unseen
    const at = r.movedAt; retreatCrossed(save, id, side); r.movedAt = at + RETREAT.legSeconds; moved++;
  }
  return { gone: false, moved };
}
// Release 605: the retreats under way (for the Atlas and for tracks): [{ id, rx, ry, home }].
export function retreatsUnderWay(save) {
  return WORLD_BEAST_IDS.filter((id) => id !== "voidWalker").map((id) => ({ id, q: save.worldBeasts?.[id]?.active })).filter(({ q }) => q?.retreat && !q.dungeon && Number.isInteger(q.rx)).map(({ id, q }) => ({ id, rx: q.rx, ry: q.ry, home: q.retreat.home }));
}
// Release 259 pursuit. `canPursue` says whether beast `id` may follow the Wayfarer out of (rx, ry) by (dx, dy) now.
export function canPursue(save, id, rx, ry, dx, dy) {
  const q = save.worldBeasts?.[id]?.active, tx = rx + dx, ty = ry + dy;
  if (!q || q.retreat || q.cornered || q.dungeon || q.astralJoined || PURSUIT.exclude.includes(id) || q.rx !== rx || q.ry !== ry) return false; // 653: a beast at bay at home stays there
  if ((q.chase || 0) >= (PURSUIT.limits[id] ?? PURSUIT.sections)) return false;
  if (WORLD_BEAST_IDS.some((k) => k !== id && save.worldBeasts[k]?.active && !save.worldBeasts[k].active.dungeon && save.worldBeasts[k].active.rx === tx && save.worldBeasts[k].active.ry === ty)) return false; // one beast to a section
  const qb = save.questingBeast?.active; return !(qb && qb.rx === tx && qb.ry === ty);
}
// It followed: it now holds the next section, and has one fewer crossing left in this encounter.
export function pursued(save, id, dx, dy) { const q = save.worldBeasts[id].active; q.rx += dx; q.ry += dy; q.chase = (q.chase || 0) + 1; return q; }
// Where it comes in: `inset` tiles inside the gate the Wayfarer entered by, on the nearest ground it can hold.
export function pursuitSpawn(save, id, map, rx, ry, dx, dy) {
  const q = save.worldBeasts[id], ex = sectionExits(save.seed, rx, ry), I = PURSUIT.inset;
  const want = dx > 0 ? { x: I, y: ex.west } : dx < 0 ? { x: 31 - I, y: ex.east } : dy > 0 ? { x: ex.north, y: I } : { x: ex.south, y: 31 - I };
  const at = (map?.tiles || []).filter((t) => beastGround(id, t) && t.x > 1 && t.y > 1 && t.x < 30 && t.y < 30).sort((a, b) => Math.hypot(a.x - want.x, a.y - want.y) - Math.hypot(b.x - want.x, b.y - want.y))[0];
  return at ? { id: `world-beast:${id}:${q.cycle}`, kind: WORLD_BEASTS[id].kind, x: at.x, y: at.y, boss: true, worldBeast: id, traits: [] } : null;
}
// Placement geometry (release 261; Tim: "there should always be a path of retreat for the creature, that's a rule... the
// large creatures shouldn't be trapped on small islands"). Flood the section over the ground the beast can stand on or
// cross in its retreat (retreatPassable for its retreatMoves). A region is sound when it reaches a section edge (a way
// out) and holds at least PLACEMENT.minRegion tiles (PLACEMENT.big for the large beasts). Returns { ok: Uint8Array(1024) }.
export const PLACEMENT = { minRegion: 40, big: 120, bigBeasts: ["mountainTurtle", "morphingBlob", "tremorWorm", "lightningGiant", "astralWorm"] };
export function placementRegions(map, here) {
  const tiles = map?.tiles || [], B = WORLD_BEASTS[here], mode = B?.retreatMoves || "walk", need = PLACEMENT.bigBeasts.includes(here) ? PLACEMENT.big : PLACEMENT.minRegion;
  const pass = (t) => !!t && (beastGround(here, t) || retreatPassable(t, mode)), label = new Int32Array(1024).fill(-1), ok = new Uint8Array(1024);
  for (let i = 0; i < 1024; i++) {
    if (label[i] >= 0 || !pass(tiles[i])) continue;
    const queue = [i], comp = []; label[i] = i; let edge = false;
    for (let n = 0; n < queue.length; n++) { const k = queue[n], x = k % 32, y = Math.floor(k / 32); comp.push(k); if (x === 0 || y === 0 || x === 31 || y === 31) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * 32 + nx; if (nx < 0 || ny < 0 || nx > 31 || ny > 31 || label[j] >= 0 || !pass(tiles[j])) continue; label[j] = i; queue.push(j); } }
    if (edge && comp.length >= need) for (const k of comp) ok[k] = 1;
  }
  return { ok };
}
// Ground a beast can be placed on: open land, or open sea for the marine beasts.
function beastGround(here, t) {
  const marine = here === "voidWalker" || here === "psychicCrystal" || here === "astralWorm" || here === "lightningGiant" || here === "mountainTurtle"; // release 261: the Turtle walks the sea on ice
  return marine && marineTileOpen(t) || here === "astralWorm" && astralSpawnWater(t) || !t.blocked && !t.structure && !t.environment && !LETHAL_KINDS.has(t.kind);
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
    if (a && !(Number(a.wounds) > 0 && Number(a.wounds) < 1)) delete a.wounds; else if (a) a.wounds = Number(a.wounds); // release 353: the share of health a hurt beast has left
    if (a) { const chase = Math.max(0, Math.floor(Number(q.active.chase) || 0)); if (chase) a.chase = chase; else delete a.chase; } // release 259: sections it has followed this encounter
    all[id] = { cycle: Math.max(0, Math.floor(Number(q.cycle) || 0)), cooldown: Math.max(0, Math.floor(Number(q.cooldown) || 0)), active: a, slain: Math.max(0, Math.floor(Number(q.slain) || 0)), escaped: Math.max(0, Math.floor(Number(q.escaped) || 0)), ...(q.spoils === true ? { spoils: true } : {}) }; // spoils (release 263): its first-kill Sigil and Echo were given
  }
  save.worldBeasts = all; ensureBeastGap(save);
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
  return { home: { rx: r.home.rx, ry: r.home.ry, found: !!r.home.found }, side: Object.hasOwn(OPPOSITE, r.side) ? r.side : null, legs: Math.max(0, Math.floor(Number(r.legs) || 0)), ...(validRetreatEntry(r.entry, r.side) ? { entry: { x: r.entry.x, y: r.entry.y } } : {}), ...(validRetreatVitals(r.vitals) ? { vitals: { hp: r.vitals.hp, maxHp: r.vitals.maxHp, damage: r.vitals.damage } } : {}),
    // Release 609: the out-of-sight clock (605) and the homes already tried (609) survive every load; 605 dropped `movedAt` here, so
    // an unseen retreat never moved (the pre-publish review of 605 found it).
    ...(Number.isFinite(r.movedAt) ? { movedAt: Number(r.movedAt) } : {}), ...(Array.isArray(r.tried) ? { tried: r.tried.filter((k) => typeof k === "string" && /^-?\d+,-?\d+$/.test(k)).slice(-16) } : {}), ...(Number(r.replans) > 0 ? { replans: Math.floor(Number(r.replans)) } : {}) };
}
// A retreating beast's spawn: it comes in by the gate on its entry side (or stands mid-section, where it fled from).
function fleeSpawn(save, here, rx, ry) {
  const q = save.worldBeasts[here];
  if(here==="astralWorm"&&q.active.astralRetreat?.actor)return {...JSON.parse(JSON.stringify(q.active.astralRetreat.actor)),dead:false,retreating:true,untargetable:true};
  const r = q.active.retreat, side = r.side, ex = sectionExits(save.seed, rx, ry), at = here === "voidWalker" && validRetreatEntry(r.entry, side) ? r.entry : side === "east" ? { x: 31 - RETREAT.inset, y: ex.east } : side === "west" ? { x: RETREAT.inset, y: ex.west } : side === "south" ? { x: ex.south, y: 31 - RETREAT.inset } : side === "north" ? { x: ex.north, y: RETREAT.inset } : { x: 15.5, y: 15.5 };
  return { id: `world-beast:${here}:${q.cycle}${here === "voidWalker" && !r.legs ? "" : `:flee:${r.legs}`}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, retreating: true, ...(here === "voidWalker" && validRetreatVitals(r.vitals) ? { retreatVitals: { ...r.vitals } } : {}), traits: [] };
}
// Called once per overworld section load. Returns the spawn of the beast holding this section, or null. One beast holds
// a section at a time, and never one the Questing Beast holds.
// Release 273 (Tim, 2026-10-21: "you won't see all of these world monsters... until... that'll be tied to your aperture...
// at aperture 3... aperture 4, you can see the blob... 5, you can see the robot... 6, you can see the astral worm... a phased
// rollout... the void walker... at any level starting at aperture 3... and the crystal... at aperture 8, you can see the
// questing beast"). The Aperture tier (items.ts APERTURE_BANDS; tier 3 is the Resonant band) a new meeting needs. A beast
// already met (active, retreating or tracked) is never withdrawn by this.
export const BEAST_APERTURE = { mountainTurtle: 3, voidWalker: 3, psychicCrystal: 3, morphingBlob: 4, lightningGiant: 5, astralWorm: 6, nanobotKnight: 7, tremorWorm: 7, questingBeast: 8 };
export const beastUnlocked = (save, id) => apertureTier(save?.perception?.aperture || 0) >= (BEAST_APERTURE[id] ?? 0);
// Release 567 (Tim: "I have never... seen the tremor worm yet"): a beast held its section until it was killed or had beaten
// the Wayfarer, so one that claimed a section the Wayfarer only passed through waited there for good, and never met them
// again. A beast never fought (no tries, wounds, chase or retreat) now lets its section go once the Wayfarer has entered
// `after` sections elsewhere, and can claim another (a new cycle, so a new roll).
export const BEAST_WANDER = { after: 16 };
function wanderUnmet(save, rx, ry) {
  for (const id of WORLD_BEAST_IDS) {
    const q = save.worldBeasts[id], a = q?.active;
    if (!a || a.dungeon || a.retreat || a.cornered || a.tries || a.wounds || a.chase || !Number.isInteger(a.rx) || astralReservedCompanion(save, id)) continue;
    if (a.rx === rx && a.ry === ry) { delete a.away; continue; }
    a.away = (Number(a.away) || 0) + 1;
    if (a.away >= BEAST_WANDER.after) { q.active = null; q.cycle = (q.cycle || 0) + 1; }
  }
}
export function worldBeastFor(save, map, rx, ry) {
  ensureWorldBeasts(save, false);
  if (!map) return null;
  wanderUnmet(save, rx, ry); // release 567: counted on every section entered, towns too
  if (map.settlement || map.tiles?.length !== 1024) { const id = WORLD_BEAST_IDS.find((k) => { const a = save.worldBeasts[k].active; return a?.retreat && !a.dungeon && a.rx === rx && a.ry === ry; }); return id ? fleeSpawn(save, id, rx, ry) : null; } // release 241: fleeing, it passes through a settlement too
  const qb = save.questingBeast?.active, held = qb && qb.rx === rx && qb.ry === ry;
  let here = WORLD_BEAST_IDS.find((id) => { const a = save.worldBeasts[id].active; return a && !a.dungeon && !astralReservedCompanion(save,id) && a.rx === rx && a.ry === ry; }), claimed = false;
  for (const id of WORLD_BEAST_IDS) { // cooldowns run down as sections are entered, and a free beast may claim this one
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (q.active) continue;
    if (q.cooldown > 0) { q.cooldown--; continue; }
    if (here || held || Math.abs(rx) + Math.abs(ry) < B.minDepth || !beastUnlocked(save, id) || !encounterReady(save)) continue; // release 261: the buffer between meetings (273: and the Aperture)
    if ((hashSeed(`${save.seed}:world-beast:${id}:v1:${q.cycle}:${rx}:${ry}`) % 1000) / 1000 >= B.chance * encounterChance(save)) continue;
    q.active = { rx, ry, tries: 0 }; here = id; encounterMet(save); claimed = true;
  }
  if (!here) return null;
  const q = save.worldBeasts[here];
  if (q.active.retreat) return fleeSpawn(save, here, rx, ry);
  const open = map.tiles.filter((t) => beastGround(here, t) && t.x > 7 && t.y > 7 && t.x < 24 && t.y < 24); // release 257: the Giant may be met at sea
  // Release 261: only ground it could retreat from (placementRegions); a beast already met keeps whatever ground it had.
  const regions = placementRegions(map, here), sound = open.filter((t) => regions.ok[t.y * 32 + t.x]), pool = sound.length || q.active.tries ? (sound.length ? sound : open) : [];
  const at = pool.sort((a, b) => hashSeed(`wb:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wb:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) { if (!q.active.tries) { q.active = null; if (claimed) ensureBeastGap(save).fresh = ENCOUNTER.newSections; } return null; } // no valid terrain for this beast: it does not hold the section (and was never met)
  return { id: `world-beast:${here}:${q.cycle}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, traits: [] };
}
// Passing beasts (release 569; Tim, 2026-10-29: "it would be great to be able to just be wandering through the world and see
// a world beast retreating... just moving along to where it wants to go. And it's not engaging you, and you can't kill
// it"). Now and then (`chance` of the sections entered with no beast of their own) a world beast the Wayfarer's Aperture
// has unlocked crosses the section from one edge to the opposite one, bound for its home ground: untargetable, harmless,
// never saved with the section, gone at the far edge. Which beast, which way and whether one passes are fixed by the seed,
// the section and how many sections have been explored. The Atlas is not told; it is just something seen.
export const PASSING = { chance: .045, minDepth: 6, speed: 1.7 };
export function passingBeastFor(save, map, rx, ry, explored = 0) {
  if (!map || map.settlement || map.tiles?.length !== 1024 || Math.abs(rx) + Math.abs(ry) < PASSING.minDepth) return null;
  const h = hashSeed(`${save.seed}:passing-beast:v1:${rx}:${ry}:${explored}`); if ((h % 1000) / 1000 >= PASSING.chance) return null;
  const ids = WORLD_BEAST_IDS.filter((id) => id !== "astralWorm" && id !== "voidWalker" && beastUnlocked(save, id) && !(save.worldBeasts?.[id]?.active?.rx === rx && save.worldBeasts?.[id]?.active?.ry === ry));
  if (!ids.length) return null;
  const id = ids[(h >>> 10) % ids.length], B = WORLD_BEASTS[id], ex = sectionExits(save.seed, rx, ry), across = (h >>> 4) & 1;
  const [from, to] = across ? [{ x: .6, y: ex.west, side: "west" }, { x: 30.4, y: ex.east, side: "east" }] : [{ x: ex.north, y: .6, side: "north" }, { x: ex.south, y: 30.4, side: "south" }];
  const [a, b] = (h >>> 6) & 1 ? [to, from] : [from, to], mode = B.retreatMoves === "walk" ? "walk" : "through";
  const path = retreatPath(map, a, b, mode) || [{ x: b.x, y: b.y }];
  return { id: `passing-beast:${id}:${rx}:${ry}:${explored}`, kind: B.kind, x: a.x, y: a.y, passingBeast: id, fleeTo: { x: b.x, y: b.y, side: b.side }, fleePath: path, fleeSpeed: PASSING.speed, traits: [] };
}
export function worldBeastTriesLeft(save, id) { return WORLD_BEASTS[id].tries - (save.worldBeasts?.[id]?.active?.tries || 0); }

// Provisional follow-on balance: level is a strength floor, never a spawn gate.
export const BEAST_BASELINE = { level: 8, starterHit: 16, starterHp: 102, starterGuard: .025, damageFloor: 60, questingDominance: 1.15 };
export function beastTuningReference(save, stats = {}) { return stageOneBeastReference(save, liveBeastReference(save, stats)); }
// The Wayfarer as they stand, before any Stage 1 hold (release 331: also what a Listener kill catches the beasts up to).
export function liveBeastReference(save, stats = {}) {
  const actualLevel = Math.max(1, Number(save.level) || 1), level = Math.max(BEAST_BASELINE.level, actualLevel);
  const weapon = save.equipment?.[save.activeWeaponSlot], levelBonus = Math.floor((level - 1) * .6) - Math.floor((actualLevel - 1) * .6);
  return ({ level, perHit: Math.max(BEAST_BASELINE.starterHit, (Number(weapon?.power) || 6) + (Number(stats.meleeBonus) || 0) + levelBonus),
    maxHp: Math.max(BEAST_BASELINE.starterHp, (Number(save.maxHp) || 60) + (level - actualLevel) * 6),
    guard: Math.max(BEAST_BASELINE.starterGuard, Math.min(.75, Number(stats.damageReduction) || 0)) }); // release 275: Stage 1 beasts are held from tier 13 until three Listeners
}
// Release 307 (Tim: "everybody's health is too much... cut their health in half... decrease their overall damage output
// by ten percent"): every world beast's vitals (and so the Questing Beast's and the Mire Heart's, derived from them) scale here.
export const BEAST_BALANCE = { hp: .5, damage: .9 };
export function beastProfileVitals(profile, save, stats = {}) {
  const r = beastTuningReference(save, stats);
  return { hp: Math.round(BEAST_BALANCE.hp * Math.max(Number(profile.nativeHpFloor)||0, Math.round(r.perHit * profile.hitsToKill + profile.hpPerLevel * r.level))),
    damage: Math.round(BEAST_BALANCE.damage * Math.max(Number(profile.nativeDamageFloor)||0, Math.ceil(BEAST_BASELINE.damageFloor / (1 - r.guard)), Math.round(r.maxHp * profile.damageShare / (1 - r.guard)))) };
}

// Tunes a created combatant to the Wayfarer, as the Questing Beast is tuned.
export function tuneWorldBeast(c, save, id, stats = {}) {
  const B = WORLD_BEASTS[id]; if (!B) return c;
  const v = beastProfileVitals(B, save, stats), hp = Math.max(Math.round((Number(c.maxHp) || 0) * BEAST_BALANCE.hp), v.hp), damage = Math.max(Math.round((Number(c.damage) || 0) * BEAST_BALANCE.damage), v.damage); // release 307: the pack's own floor scales too
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
export function worldBeastPlayerFell(save, rx, ry, aliveIds, dungeonId = null, triesOff = false) {
  ensureWorldBeasts(save, false);
  const notes = [];
  for (const id of WORLD_BEAST_IDS) {
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (!aliveIds.includes(id) || !q.active || q.active.retreat || (q.active.dungeon ? q.active.dungeon !== dungeonId : q.active.rx !== rx || q.active.ry !== ry)) continue; // a retreating beast takes no tries
    if (triesOff) { const left = Math.max(0, Math.ceil(B.patience - (Number(q.active.patience) || 0))); notes.push(`${B.name} still holds ${q.active.dungeon ? "that place" : `${rx},${ry}`}. Its patience: about ${Math.ceil(left / 60)} minute${left > 60 ? "s" : ""} of fighting left.`); continue; } // release 345
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
  const ids = WORLD_BEAST_IDS.filter((k) => WORLD_BEASTS[k].dungeonChance != null), water = map.tiles.filter((t) => t.kind === "dungeonWater");
  let here = ids.find((k) => !astralReservedCompanion(save,k) && save.worldBeasts[k].active?.dungeon === dungeonId);
  const coords = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(dungeonId), depth = coords ? Math.abs(Number(coords[1])) + Math.abs(Number(coords[2])) : -1; // ordinary dungeons only (not the story dungeon, arenas, hunts or runs)
  if (!here && depth >= 0) for (const k of ids) {
    const q = save.worldBeasts[k], B = WORLD_BEASTS[k];
    if (q.active || q.cooldown > 0 || depth < B.minDepth || !beastUnlocked(save, k) || (Number(save.level) || 1) < (B.dungeonMinLevel || 1) || (k === "psychicCrystal" && !water.length) || !encounterReady(save)) continue; // release 261: the buffer applies in dungeons too
    if ((hashSeed(`${save.seed}:world-beast-dungeon:${k}:v1:${q.cycle}:${dungeonId}`) % 1000) / 1000 >= WORLD_BEASTS[k].dungeonChance * mealLure(save).chance) continue;
    q.active = { dungeon: dungeonId, tries: 0 }; here = k; encounterMet(save); break;
  }
  if (!here) return null;
  const q = save.worldBeasts[here], entry = map.entry || { x: 4, y: 5 }, width = Number(map.width) || 32;
  if (here === "voidWalker" || here === "astralWorm") {
    const level = map.levelId || "root";
    q.active.dungeonLevel ??= level; // one physical Walker, not a fresh-health copy on every dungeon floor
    if (q.active.dungeonLevel !== level) return null; // an unfinished retreat remains on its source floor for revisit
  }
  if(here==="astralWorm"&&q.active.astralRetreat?.actor)return {...JSON.parse(JSON.stringify(q.active.astralRetreat.actor)),dead:false,retreating:true,untargetable:true};
  const near = (t) => water.some((w) => Math.abs(w.x - t.x) + Math.abs(w.y - t.y) <= 4);
  const reachable = here === "voidWalker" ? walkerReachableTiles(map, entry) : null;
  const spots = map.tiles.filter((t) => (!reachable || reachable.has(t.y * width + t.x)) && ((!t.blocked && !LETHAL_KINDS.has(t.kind) && t.kind !== "dungeonWater") || here === "astralWorm" && astralSpawnWater(t)) && t.x > 1 && t.y > 1 && t.x < width - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 7);
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
const voidCircle = (value, width, height) => voidRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.radius) && value.radius > 0 && value.x > -value.radius && value.y > -value.radius && value.x < width + value.radius && value.y < height + value.radius && value.radius <= VOID_SCARS.maxRadius && (value.visualLift === undefined || Number.isFinite(value.visualLift) && Math.abs(value.visualLift) <= VOID_SCARS.maxElevation);
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
// `spill` records the part of a blast cast in an adjacent section: its center may then lie outside this map,
// as long as the disk still overlaps it. Circles store that out-of-section center unchanged.
export function consumeVoidTerrain(save, map, areaKey, center, radius, actors = [], { spill = false } = {}) {
  if (!voidAreaKey(areaKey)) return voidResult(false, 'unsupported-area');
  const dimensions = voidGeometry(map, areaKey); if (!dimensions) return voidResult(false, 'unsupported-area');
  if (!Number.isFinite(center?.x) || !Number.isFinite(center?.y) || !Number.isFinite(radius) || radius <= 0 || radius > VOID_SCARS.maxRadius || (spill ? center.x <= -radius || center.y <= -radius || center.x >= dimensions.width + radius || center.y >= dimensions.height + radius : center.x < 0 || center.y < 0 || center.x >= dimensions.width || center.y >= dimensions.height) || center.visualLift !== undefined && (!Number.isFinite(center.visualLift) || Math.abs(center.visualLift) > VOID_SCARS.maxElevation) || !Array.isArray(actors)) return voidResult(false, 'invalid-region');
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

// A narrow exception: an explicitly reserved Walker is emitted by the Astral companion path only.
function astralReservedCompanion(save,id) {
  const a=save.worldBeasts?.[id]?.active,w=save.worldBeasts?.astralWorm;
  return id==='voidWalker' && a?.astralPairOf && w?.active && a.astralPairOf===`world-beast:astralWorm:${w.cycle}`;
}
