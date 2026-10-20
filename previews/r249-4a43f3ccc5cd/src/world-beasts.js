// World beasts (release 235; Tim, 2026-10-19: "more monsters similar to the Questing Beast … strong … varied moves and
// attacks … hyper-aggressive … crazy amounts of health … roaming world bosses … you still get three tries"). Each one
// works the way the Questing Beast does (src/questing-beast.ts, which is left as it was): now and then it claims a wild
// section; it stays until it is killed or it has killed the Wayfarer `tries` times; then it is gone, and after a
// cooldown counted in sections entered a new hunt can begin somewhere else. Its health and blows are tuned to the
// Wayfarer's power. The creature itself (body, attacks, brain) is a Monster Pack entry; this module holds only the hunt.
import { hashSeed } from "./random.js?v=r249-4a43f3ccc5cd";
import { LETHAL_KINDS } from "./landscape.js?v=r249-4a43f3ccc5cd";
import { sectionExits } from "./world.js?v=r249-4a43f3ccc5cd";

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
    dungeonChance: .35, dungeonMinLevel: 8, // Tim: it also haunts dungeons, but only ones with water in them (any amount); not a new Wayfarer's, and only ordinary dungeons minDepth sections out
    flee: "The Psychic Crystal's haze goes still and grey. It drifts away toward open water.",
    fleeDungeon: "The Psychic Crystal's haze goes still and grey. It drifts toward the water.",
    homeLine: "The Psychic Crystal sinks into the water without a ripple, and is gone.",
    arrive: "The air here is thin and bright, and your thoughts feel watched. The Psychic Crystal is here.",
    arriveDungeon: "A pale light drifts through the halls. The Psychic Crystal roams this place.",
    slain: "The Psychic Crystal cracks from end to end, and its light goes out.",
    gone: "The Psychic Crystal has had enough of your mind. It drifts away; in time it will settle somewhere else.",
  },
};
export const WORLD_BEAST_IDS = Object.keys(WORLD_BEASTS);

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
  ensureWorldBeasts(save); const B = WORLD_BEASTS[id], q = save.worldBeasts[id], H = BEAST_HOMES[B.home];
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
  if (r.home.dungeon) return null; // in a dungeon it is already home: it goes to the water
  const dx = r.home.rx - rx, dy = r.home.ry - ry;
  if (!dx && !dy) return null;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "east" : "west") : (dy > 0 ? "south" : "north");
}
// Where a retreating beast is heading in the loaded section: the gate it leaves by, or the home ground it goes into.
export function retreatTarget(r, id, map, rx, ry, exits, from) {
  const side = retreatSide(r, rx, ry);
  if (side) return { x: side === "east" ? 31.4 : side === "west" ? -.4 : exits[side], y: side === "south" ? 31.4 : side === "north" ? -.4 : exits[side], side };
  const H = BEAST_HOMES[WORLD_BEASTS[id]?.home] || null, spots = !r.home.found || !H ? [] : H.object ? (map.objects || []).filter(H.object) : (map.tiles || []).filter(H.tile);
  const best = spots.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
  return { x: best ? best.x : (Number(map?.width) || 32) / 2 - .5, y: best ? best.y : Math.floor((map?.tiles?.length || 1024) / (Number(map?.width) || 32)) / 2 - .5, side: null, home: true };
}
// The beast crossed out of a section: it is now in the next one, coming in from the opposite side.
export function retreatCrossed(save, id, side) {
  const q = save.worldBeasts[id].active, [dx, dy] = SIDES[side];
  q.rx += dx; q.ry += dy; q.retreat.side = OPPOSITE[side]; q.retreat.legs++;
  return { rx: q.rx, ry: q.ry };
}
// It is home, or got away because the Wayfarer did not follow: the hunt ends as an escape (no try is lost).
export function retreatEnded(save, id) {
  const B = WORLD_BEASTS[id], q = save.worldBeasts[id]; q.escaped++; q.cycle++; q.active = null; q.cooldown = B.cooldownEscaped;
  return B.homeLine;
}
// Called on every area load: a retreating beast the Wayfarer did not follow into its current section is gone.
export function worldBeastsLost(save, area, rx, ry, dungeonId = null) {
  ensureWorldBeasts(save); const lost = [];
  for (const id of WORLD_BEAST_IDS) { const a = save.worldBeasts[id].active; if (a?.retreat && (a.dungeon ? area !== "dungeon" || dungeonId !== a.dungeon : area !== "overworld" || a.rx !== rx || a.ry !== ry)) { retreatEnded(save, id); lost.push(id); } }
  return lost;
}
export const isWorldBeastKind = (kind) => WORLD_BEAST_IDS.some((id) => WORLD_BEASTS[id].kind === kind);

// save.worldBeasts: { id: { cycle, cooldown, active: { rx, ry, tries } | null, slain, escaped } } (additive; unknown ids kept).
export function ensureWorldBeasts(save) {
  const all = save.worldBeasts && typeof save.worldBeasts === "object" ? { ...save.worldBeasts } : {};
  for (const id of WORLD_BEAST_IDS) {
    const q = all[id] && typeof all[id] === "object" ? all[id] : {};
    const a = q.active && ((Number.isInteger(q.active.rx) && Number.isInteger(q.active.ry)) || typeof q.active.dungeon === "string") ? { ...q.active, rx: q.active.rx, ry: q.active.ry, tries: Math.max(0, Math.floor(Number(q.active.tries) || 0)), patience: Math.max(0, Number(q.active.patience) || 0), retreat: cleanRetreat(q.active.retreat) } : null;
    if (a && !a.retreat) delete a.retreat;
    if (a && !a.patience) delete a.patience; // both are added only once there is something to keep
    all[id] = { cycle: Math.max(0, Math.floor(Number(q.cycle) || 0)), cooldown: Math.max(0, Math.floor(Number(q.cooldown) || 0)), active: a, slain: Math.max(0, Math.floor(Number(q.slain) || 0)), escaped: Math.max(0, Math.floor(Number(q.escaped) || 0)) };
  }
  save.worldBeasts = all;
  return save;
}

function cleanRetreat(r) {
  if (!r || typeof r !== "object" || !r.home) return null;
  if (typeof r.home.dungeon === "string") return { home: { dungeon: r.home.dungeon, found: !!r.home.found }, side: null, legs: 0 }; // release 249: a retreat inside a dungeon
  if (!Number.isInteger(r.home.rx) || !Number.isInteger(r.home.ry)) return null;
  return { home: { rx: r.home.rx, ry: r.home.ry, found: !!r.home.found }, side: Object.hasOwn(OPPOSITE, r.side) ? r.side : null, legs: Math.max(0, Math.floor(Number(r.legs) || 0)) };
}
// A retreating beast's spawn: it comes in by the gate on its entry side (or stands mid-section, where it fled from).
function fleeSpawn(save, here, rx, ry) {
  const q = save.worldBeasts[here], r = q.active.retreat, side = r.side, ex = sectionExits(save.seed, rx, ry), at = side === "east" ? { x: 31 - RETREAT.inset, y: ex.east } : side === "west" ? { x: RETREAT.inset, y: ex.west } : side === "south" ? { x: ex.south, y: 31 - RETREAT.inset } : side === "north" ? { x: ex.north, y: RETREAT.inset } : { x: 15.5, y: 15.5 };
  return { id: `world-beast:${here}:${q.cycle}:flee:${r.legs}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, retreating: true, traits: [] };
}
// Called once per overworld section load. Returns the spawn of the beast holding this section, or null. One beast holds
// a section at a time, and never one the Questing Beast holds.
export function worldBeastFor(save, map, rx, ry) {
  ensureWorldBeasts(save);
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
  const open = map.tiles.filter((t) => !t.blocked && !t.structure && !t.environment && !LETHAL_KINDS.has(t.kind) && t.x > 7 && t.y > 7 && t.x < 24 && t.y < 24);
  const at = open.sort((a, b) => hashSeed(`wb:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wb:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) { if (!q.active.tries) q.active = null; return null; } // nowhere to stand here (all water): it does not hold the section
  return { id: `world-beast:${here}:${q.cycle}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, traits: [] };
}
export function worldBeastTriesLeft(save, id) { return WORLD_BEASTS[id].tries - (save.worldBeasts?.[id]?.active?.tries || 0); }

// Tunes a created combatant to the Wayfarer, as the Questing Beast is tuned.
export function tuneWorldBeast(c, save, id, stats = {}) {
  const B = WORLD_BEASTS[id]; if (!B) return c;
  const level = Math.max(1, Number(save.level) || 1), weapon = save.equipment?.[save.activeWeaponSlot], perHit = Math.max(6, (Number(weapon?.power) || 6) + (Number(stats.meleeBonus) || 0));
  const guard = Math.max(0, Math.min(.75, Number(stats.damageReduction) || 0)), hp = Math.round(perHit * B.hitsToKill + B.hpPerLevel * level);
  Object.assign(c, { worldBeast: id, boss: true, hp, maxHp: hp, damage: Math.max(4, Math.round((Number(save.maxHp) || 60) * B.damageShare / (1 - guard))), staggerResistance: B.staggerResistance, speedMultiplier: B.speed, attackGap: B.attackGap, evasive: true });
  return c;
}
// The beast falls: pay its bounty and start its cooldown.
export function worldBeastSlain(save, id) {
  ensureWorldBeasts(save); const B = WORLD_BEASTS[id], q = save.worldBeasts[id], marks = B.rewardMarks + B.rewardPerLevel * (Number(save.level) || 1);
  save.currency = (Number(save.currency) || 0) + marks;
  q.slain++; q.cycle++; q.active = null; q.cooldown = B.cooldownSlain;
  return { marks, message: `${B.slain} +${marks} marks.` };
}
// The Wayfarer fell in a beast's section while it lived. Returns a message, or null.
export function worldBeastPlayerFell(save, rx, ry, aliveIds, dungeonId = null) {
  ensureWorldBeasts(save);
  for (const id of WORLD_BEAST_IDS) {
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (!aliveIds.includes(id) || !q.active || q.active.retreat || (q.active.dungeon ? q.active.dungeon !== dungeonId : q.active.rx !== rx || q.active.ry !== ry)) continue; // a retreating beast takes no tries
    q.active.tries++;
    if (q.active.tries < B.tries) { const left = B.tries - q.active.tries; return `${B.name} still holds ${q.active.dungeon ? "that place" : `${rx},${ry}`}. ${left} ${left === 1 ? "try remains" : "tries remain"}.`; }
    q.escaped++; q.cycle++; q.active = null; q.cooldown = B.cooldownEscaped;
    return B.gone;
  }
  return null;
}
// Release r249-4a43f3ccc5cd: a beast that haunts dungeons (the Psychic Crystal, `dungeonChance`) may claim a dungeon with water in it on
// entry, and is there whenever that dungeon is loaded until the hunt ends. Returns its spawn, or null.
export function worldBeastForDungeon(save, map, dungeonId) {
  ensureWorldBeasts(save);
  if (!map?.tiles || !dungeonId) return null;
  const ids = WORLD_BEAST_IDS.filter((k) => WORLD_BEASTS[k].dungeonChance), water = map.tiles.filter((t) => t.kind === "dungeonWater");
  let here = ids.find((k) => save.worldBeasts[k].active?.dungeon === dungeonId);
  const coords = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/.exec(dungeonId), depth = coords ? Math.abs(Number(coords[1])) + Math.abs(Number(coords[2])) : -1; // ordinary dungeons only (not the story dungeon, arenas, hunts or runs)
  if (!here && water.length && depth >= 0) for (const k of ids) {
    const q = save.worldBeasts[k], B = WORLD_BEASTS[k];
    if (q.active || q.cooldown > 0 || depth < B.minDepth || (Number(save.level) || 1) < (B.dungeonMinLevel || 1)) continue;
    if ((hashSeed(`${save.seed}:world-beast-dungeon:${k}:v1:${q.cycle}:${dungeonId}`) % 1000) / 1000 >= WORLD_BEASTS[k].dungeonChance) continue;
    q.active = { dungeon: dungeonId, tries: 0 }; here = k; break;
  }
  if (!here) return null;
  const q = save.worldBeasts[here], entry = map.entry || { x: 4, y: 5 }, width = Number(map.width) || 32;
  const near = (t) => water.some((w) => Math.abs(w.x - t.x) + Math.abs(w.y - t.y) <= 4);
  const spots = map.tiles.filter((t) => !t.blocked && !LETHAL_KINDS.has(t.kind) && t.kind !== "dungeonWater" && t.x > 1 && t.y > 1 && t.x < width - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 7);
  const pool = spots.filter(near).length ? spots.filter(near) : spots, at = pool.sort((a, b) => hashSeed(`wbd:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wbd:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) { if (!q.active.tries && !q.active.retreat) q.active = null; return null; }
  return { id: `world-beast:${here}:${q.cycle}${q.active.retreat ? ":flee" : ""}`, kind: WORLD_BEASTS[here].kind, x: at.x, y: at.y, boss: true, worldBeast: here, retreating: !!q.active.retreat, inDungeon: true, traits: [] };
}
// A retreat inside a dungeon: it goes to the water there (no sections to cross).
export function beginDungeonRetreat(save, id, map) {
  ensureWorldBeasts(save); const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
  q.active.retreat = { home: { dungeon: q.active.dungeon, found: (map?.tiles || []).some((t) => t.kind === "dungeonWater") }, side: null, legs: 0 };
  return { message: B.fleeDungeon || B.flee, home: q.active.retreat.home };
}
// Sections held by a beast, for the Atlas's danger marks.
export function worldBeastsHeld(save) { return WORLD_BEAST_IDS.map((id) => ({ id, name: WORLD_BEASTS[id].name, ...save.worldBeasts?.[id]?.active })).filter((q) => Number.isInteger(q.rx)); }
