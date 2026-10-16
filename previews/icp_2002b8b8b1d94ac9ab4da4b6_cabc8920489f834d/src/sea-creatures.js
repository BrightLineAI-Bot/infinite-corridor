// Surface sea creatures (water world W3, docs/water-world-design.md). They live only in water, spawn deterministically
// per section from its water tiles (landscape version 2+), and move by their own patterns instead of land pathfinding:
//   line   Lanceeel: surfaces, shows its wake line, then charges straight along it and dives.
//   orbit  Ringcoil Serpent: circles the Wayfarer, tightening until it bites; a hit throws the coil wide.
//   sine   Sinewake Serpent: weaves toward the Wayfarer in an S, segmented body, bites and backs off.
//   leap   Breachfin: marks a landing shadow, leaps out in an arc (only hittable while airborne) and crashes down.
//   hop    Mire Leech (swamps): short hops through bog water, nips on contact.
//   ambush Bog Lurker (swamps): hidden in the mire, bubbles, then bites and drags the Wayfarer a tile closer.
// Leviathans (W4, deep ocean only, at most one per section, bosses except the whale):
//   whale    Greywhale: drifts, harmless until struck; then it dives under the Wayfarer, shows a vast shadow and breaches.
//   lunge    Tyrant Mosasaur: stalks below (its shadow visible), locks on, lunges across the surface, then lies exposed.
//   reef     Reef Kraken: raises tentacles (separate, short-lived targets) in marked rings around the Wayfarer.
//   grab     Abyssal Kraken: marks the Wayfarer, then seizes and drags them toward its maw; heavy hits break the grip.
//   storm    Stormkraken: a tentacle at a time, and an ink cloud that darkens the sea around the Wayfarer.
// Every strike is telegraphed first; submerged creatures are hidden and untargetable. Data and pure rules: game.ts
// supplies the world (water test, hurt, pull) and calls `updateSeaCreature` from its enemy loop.
import { hashSeed } from "./random.js?v=icp_2002b8b8b1d94ac9ab4da4b6_cabc8920489f834d";

export const SEA_HABITATS = {
  open: ["ocean", "deepOcean", "lakeWater"],
  swamp: ["swampWater", "mireWater", "toxicMire", "toxicWater"],
  deep: ["ocean", "deepOcean"],
  // Grottoes (W6): beasts swim over the floor of the underwater scene.
  grotto: ["seabed", "kelp", "airVent", "seaCurrent", "chapelFloor", "pearlSand", "ruinFloor"],
};
export const SEA_CREATURES = {
  lanceeel: { name: "Lanceeel", habitat: "open", pattern: "line", hp: 26, damage: 9, xp: 14, aggro: 7, telegraph: .9, speed: 7, reach: 8, rest: 2.2, segments: 3, colors: ["#5f8fa8", "#1c3442", "#d6f3ff"] },
  ringcoil: { name: "Ringcoil Serpent", habitat: "open", pattern: "orbit", hp: 40, damage: 8, xp: 18, aggro: 8, radius: 4.5, tighten: .35, spin: 1.1, speed: 4, biteAt: 1.2, segments: 5, colors: ["#3f7a62", "#173026", "#c9f2b0"] },
  sinewake: { name: "Sinewake Serpent", habitat: "open", pattern: "sine", hp: 55, damage: 11, xp: 24, aggro: 9, speed: 2.2, weave: 3, sway: 2.2, biteAt: .9, rest: 1.6, segments: 7, colors: ["#6b4f8a", "#221832", "#e0c8ff"] },
  breachfin: { name: "Breachfin", habitat: "open", pattern: "leap", hp: 30, damage: 12, xp: 16, aggro: 7, telegraph: .8, air: .9, splash: 1, rest: 1.8, segments: 1, colors: ["#9aa7b5", "#2b3440", "#f4f8ff"] },
  mireLeech: { name: "Mire Leech", habitat: "swamp", pattern: "hop", hp: 14, damage: 4, xp: 6, aggro: 6, hop: .9, every: .7, biteAt: .7, rest: 1, segments: 2, colors: ["#4d4a2a", "#1d1c10", "#c4c27a"] },
  greywhale: { name: "Greywhale", habitat: "deep", pattern: "whale", leviathan: true, hp: 420, damage: 14, xp: 60, aggro: 12, drift: .6, telegraph: 1.2, push: 1.5, rest: 4, size: 3, segments: 4, colors: ["#7b8a98", "#2c343c", "#e8eef4"] },
  tyrantMosasaur: { name: "Tyrant Mosasaur", habitat: "deep", pattern: "lunge", leviathan: true, boss: true, hp: 320, damage: 22, xp: 90, aggro: 12, stalk: 2.6, lockAt: 4.5, telegraph: .9, speed: 10, exposed: 1.6, size: 2.2, segments: 5, colors: ["#4b5d4a", "#1a2219", "#e9d38a"] },
  reefKraken: { name: "Reef Kraken", habitat: "deep", pattern: "reef", leviathan: true, boss: true, hp: 260, damage: 10, xp: 80, aggro: 10, every: 4, telegraph: .9, tentacles: 2, maxTentacles: 3, drift: .5, size: 2.4, segments: 1, colors: ["#a2486a", "#3a1424", "#ffc2d8"] },
  abyssalKraken: { name: "Abyssal Kraken", habitat: "deep", pattern: "grab", leviathan: true, boss: true, hp: 300, damage: 14, xp: 95, aggro: 9, telegraph: 1, hold: 2.5, drag: 2.2, biteAt: 1.8, breakAt: 25, rest: 3, size: 2.6, segments: 1, colors: ["#2d2350", "#0d0a1c", "#9c8cff"] },
  stormkraken: { name: "Stormkraken", habitat: "deep", pattern: "storm", leviathan: true, boss: true, hp: 240, damage: 10, xp: 85, aggro: 10, every: 4.5, telegraph: .9, tentacles: 1, maxTentacles: 2, inkEvery: 9, ink: 4, drift: .5, size: 2.3, segments: 1, colors: ["#3c4f63", "#121a24", "#bfe3ff"] },
  // Grotto beasts (W6) and the Elder Wyrm, the grotto's final guardian.
  grottoEel: { name: "Grotto Eel", habitat: "grotto", pattern: "line", hp: 30, damage: 10, xp: 16, aggro: 6.5, telegraph: .8, speed: 6.5, reach: 7, rest: 2, segments: 4, colors: ["#4d8a7c", "#163029", "#c8fff0"] },
  angler: { name: "Lantern Angler", habitat: "grotto", pattern: "ambush", hp: 44, damage: 13, xp: 22, aggro: 2.2, telegraph: .7, pull: 1.2, rest: 2.2, segments: 1, lure: true, colors: ["#2f3448", "#0e0f18", "#fff2a0"] },
  abyssalBeast: { name: "Abyssal Beast", habitat: "grotto", pattern: "sine", hp: 70, damage: 14, xp: 30, aggro: 8, speed: 1.8, weave: 2.2, sway: 1.4, biteAt: 1, rest: 1.8, segments: 3, size: 1.3, colors: ["#3b2d3f", "#120c14", "#ff9a7a"] },
  elderWyrm: { name: "Elder Wyrm", habitat: "grotto", pattern: "wyrm", leviathan: true, boss: true, hp: 380, damage: 16, xp: 110, aggro: 9, speed: 2, weave: 2.4, sway: 1.6, biteAt: 1, weaveFor: 4, telegraph: 1, lunge: 8, reach: 8, rest: 1.4, size: 1.5, segments: 12, colors: ["#2f5a6e", "#0f1f28", "#ffd27a"] },
  // Raised by krakens only: rises where its ring was marked, slams, sways, slams again, sinks.
  tentacle: { name: "Kraken Tentacle", habitat: "deep", pattern: "tentacle", summonOnly: true, hp: 24, damage: 10, xp: 0, life: 3.6, every: 1.6, telegraph: .5, reach: .95, size: 1, segments: 1, colors: ["#8a3a5a", "#2a0f1c", "#ffb0cc"] },
  bogLurker: { name: "Bog Lurker", habitat: "swamp", pattern: "ambush", hp: 48, damage: 10, xp: 20, aggro: 1.8, telegraph: .6, pull: 1, rest: 2.5, segments: 1, colors: ["#3e4a2c", "#151a0e", "#b7d36a"] },
};
// Spawn table: which creatures a section's water holds, and how many (bounded for mobile).
export const SEA_SPAWNS = {
  minTiles: 30,
  maxPerSection: 3,
  minFromPlaza: 6,
  open: ["lanceeel", "ringcoil", "sinewake", "breachfin"],
  lake: ["lanceeel", "breachfin"],
  swamp: ["mireLeech", "mireLeech", "bogLurker"],
  // Leviathans: sections with this many deep-ocean tiles, about one in `every`, one leviathan, weighted table.
  leviathanTiles: 120,
  leviathanEvery: 4,
  leviathans: ["greywhale", "greywhale", "greywhale", "tyrantMosasaur", "tyrantMosasaur", "reefKraken", "reefKraken", "abyssalKraken", "stormkraken"],
  leviathanFromPlaza: 8,
};
export const isSeaKind = (kind) => !!SEA_CREATURES[kind];

// Deterministic spawn list for a landscape section (version 2+), or [] when it has too little water.
export function seaSpawns(map, seed, rx, ry) {
  if (!map?.landscape || (map.landscape.version || 1) < 2) return [];
  const out = [];
  for (const habitat of ["open", "swamp"]) {
    const tiles = map.tiles.filter((t) => SEA_HABITATS[habitat].includes(t.kind) && Math.hypot(t.x - 16, t.y - 16) >= SEA_SPAWNS.minFromPlaza && t.x > 1 && t.y > 1 && t.x < 30 && t.y < 30);
    if (tiles.length < SEA_SPAWNS.minTiles) continue;
    const lake = habitat === "open" && !tiles.some((t) => t.kind !== "lakeWater"), table = lake ? SEA_SPAWNS.lake : SEA_SPAWNS[habitat];
    const n = 1 + (hashSeed(`${seed}:sea:count:${habitat}:${rx}:${ry}`) % SEA_SPAWNS.maxPerSection);
    for (let i = 0; i < n; i++) {
      const h = hashSeed(`${seed}:sea:${habitat}:${rx}:${ry}:${i}`), t = tiles[h % tiles.length], kind = table[Math.floor(h / 7) % table.length];
      out.push({ id: `sea-${kind}-${rx}-${ry}-${i}`, kind, x: t.x, y: t.y });
    }
  }
  const deep = map.tiles.filter((t) => t.kind === "deepOcean" && Math.hypot(t.x - 16, t.y - 16) >= SEA_SPAWNS.leviathanFromPlaza && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
  if (deep.length >= SEA_SPAWNS.leviathanTiles && hashSeed(`${seed}:sea:leviathan:${rx}:${ry}`) % SEA_SPAWNS.leviathanEvery === 0) {
    const h = hashSeed(`${seed}:sea:leviathan-kind:${rx}:${ry}`), kind = SEA_SPAWNS.leviathans[h % SEA_SPAWNS.leviathans.length], t = deep[Math.floor(h / 13) % deep.length];
    out.push({ id: `lev-${kind}-${rx}-${ry}`, kind, x: t.x, y: t.y });
  }
  return out;
}

// Fields a sea creature carries on top of an ordinary combatant.
export function seaCombatantFields(kind) {
  const d = SEA_CREATURES[kind];
  const under = ["line", "leap", "ambush", "lunge"].includes(d.pattern);
  return { seaKind: kind, name: d.name, hp: d.hp, maxHp: d.hp, damage: d.damage, range: 0, xpValue: d.xp, segments: d.segments, segmentSpacing: .32 * (d.size || 1), scale: d.size || 1, bodyRadius: .4 * (d.size || 1), boss: !!d.boss, leviathan: !!d.leviathan,
    hidden: under, untargetable: under, sea: { phase: "lurk", t: 0, cd: 0, n: 0, ang: 0, r: d.radius || 0, dir: 1, lastHp: d.hp } };
}

const surface = (e, on) => { e.hidden = !on; e.untargetable = !on; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function face(e, dx, dy) { (e.ai ||= {}).facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"); }
// Moves toward (tx, ty) by at most `step`, only through habitat water. Returns true if it moved.
function swimToward(e, w, hab, tx, ty, step) {
  const dx = tx - e.x, dy = ty - e.y, m = Math.hypot(dx, dy);
  if (m < 1e-6) return false;
  const k = Math.min(step, m) / m, nx = e.x + dx * k, ny = e.y + dy * k;
  if (!w.water(hab, nx, ny)) return false;
  e.x = nx; e.y = ny; face(e, dx, dy); return true;
}
// After a dive, resurface somewhere around the Wayfarer (deterministic sweep of eight bearings).
function resurface(e, w, hab, radius) {
  const s = e.sea, p = w.player;
  for (let k = 0; k < 8; k++) {
    const a = ((s.n + k) % 8) * Math.PI / 4, x = p.x + Math.cos(a) * radius, y = p.y + Math.sin(a) * radius;
    if (w.water(hab, x, y)) { e.x = x; e.y = y; s.n = (s.n + k + 3) % 8; return true; }
  }
  return false;
}

export function updateSeaCreature(e, w, dt) {
  const d = SEA_CREATURES[e.seaKind], s = e.sea, p = w.player, hab = d.habitat, gap = dist(e, p);
  s.t -= dt; s.cd = Math.max(0, s.cd - dt);
  const struck = e.hp < s.lastHp, lost = s.lastHp - e.hp; s.lastHp = e.hp;
  e.seaTele = null;
  if (d.leviathan || d.summonOnly) return updateLeviathan(e, w, dt, d, s, p, hab, gap, struck, lost);
  if (d.pattern === "line") {
    if (s.phase === "lurk") { surface(e, false); if (gap < d.aggro) { const m = gap || 1; s.line = { dx: (p.x - e.x) / m, dy: (p.y - e.y) / m, len: Math.min(d.reach, gap + 2), done: 0 }; s.phase = "telegraph"; s.t = d.telegraph; surface(e, true); e.seaTele = { type: "line", ...s.line }; } }
    else if (s.phase === "telegraph") { e.seaTele = { type: "line", ...s.line }; face(e, s.line.dx, s.line.dy); if (s.t <= 0) { s.phase = "strike"; s.hit = false; } }
    else if (s.phase === "strike") {
      const step = d.speed * dt, nx = e.x + s.line.dx * step, ny = e.y + s.line.dy * step;
      if (!w.water(hab, nx, ny) || s.line.done >= s.line.len) { s.phase = "dive"; s.t = d.rest; surface(e, false); }
      else { e.x = nx; e.y = ny; s.line.done += step; if (!s.hit && dist(e, p) < .8) { s.hit = true; w.hurt(d.damage, e); } }
    } else if (s.t <= 0) { resurface(e, w, hab, 6); s.phase = "lurk"; }
  } else if (d.pattern === "orbit") {
    if (gap > d.aggro + 4) { s.r = d.radius; return; }
    if (struck) s.r = Math.min(d.radius, s.r + 1.5);
    s.ang += s.dir * d.spin * dt; s.r -= d.tighten * dt;
    const tx = p.x + Math.cos(s.ang) * s.r, ty = p.y + Math.sin(s.ang) * s.r;
    if (!w.water(hab, tx, ty)) s.dir *= -1; else swimToward(e, w, hab, tx, ty, d.speed * dt);
    if (s.r < 2.2) e.seaTele = { type: "coil" };
    if (s.r <= d.biteAt) { if (gap < d.biteAt + .6) w.hurt(d.damage, e); s.r = d.radius; }
  } else if (d.pattern === "sine") {
    if (gap > d.aggro) return;
    s.n += dt;
    if (s.phase === "retreat") { if (s.t <= 0) s.phase = "lurk"; const m = gap || 1; swimToward(e, w, hab, e.x - (p.x - e.x) / m, e.y - (p.y - e.y) / m, d.speed * dt); return; }
    const m = gap || 1, ux = (p.x - e.x) / m, uy = (p.y - e.y) / m, sway = Math.sin(s.n * d.weave) * d.sway;
    if (!swimToward(e, w, hab, e.x + ux - uy * sway, e.y + uy + ux * sway, d.speed * dt)) swimToward(e, w, hab, p.x, p.y, d.speed * dt);
    if (gap < 2) e.seaTele = { type: "jaw" };
    if (gap < d.biteAt && s.cd <= 0) { w.hurt(d.damage, e); s.cd = d.rest; s.phase = "retreat"; s.t = d.rest; }
  } else if (d.pattern === "leap") {
    if (s.phase === "lurk") { surface(e, false); e.aloft = false; if (gap < d.aggro && w.water(hab, p.x, p.y)) { s.from = { x: e.x, y: e.y }; s.to = { x: p.x, y: p.y }; s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = { type: "shadow", x: s.to.x, y: s.to.y }; } }
    else if (s.phase === "telegraph") { e.seaTele = { type: "shadow", x: s.to.x, y: s.to.y }; if (s.t <= 0) { s.phase = "air"; s.t = d.air; surface(e, true); e.aloft = true; } }
    else if (s.phase === "air") {
      const k = 1 - Math.max(0, s.t) / d.air; e.x = s.from.x + (s.to.x - s.from.x) * k; e.y = s.from.y + (s.to.y - s.from.y) * k; e.leapHeight = Math.sin(k * Math.PI) * 1.4;
      face(e, s.to.x - s.from.x, s.to.y - s.from.y); e.seaTele = { type: "shadow", x: s.to.x, y: s.to.y };
      if (s.t <= 0) { e.leapHeight = 0; e.aloft = false; if (dist(s.to, p) < d.splash) w.hurt(d.damage, e); s.phase = "dive"; s.t = d.rest; surface(e, false); }
    } else if (s.t <= 0) { resurface(e, w, hab, 5); s.phase = "lurk"; }
  } else if (d.pattern === "hop") {
    if (gap > d.aggro) return;
    if (s.t <= 0) { s.t = d.every; swimToward(e, w, hab, p.x, p.y, d.hop); }
    if (gap < d.biteAt && s.cd <= 0) { w.hurt(d.damage, e); s.cd = d.rest; }
  } else if (d.pattern === "ambush") {
    if (s.phase === "lurk") { surface(e, false); if (gap < d.aggro) { s.phase = "telegraph"; s.t = d.telegraph; surface(e, true); e.seaTele = { type: "bubbles" }; } }
    else if (s.phase === "telegraph") { e.seaTele = { type: "bubbles" }; if (s.t <= 0) { if (gap < d.aggro + .4) { w.hurt(d.damage, e); w.pull(e, d.pull); } s.phase = "dive"; s.t = d.rest; surface(e, false); } }
    else if (s.t <= 0) s.phase = "lurk";
  }
}

// ---------------------------------------------------------------- leviathans (W4)
// Two to three ring positions around the Wayfarer on deep water (deterministic by the creature's counter).
function rings(e, w, hab, count) {
  const p = w.player, out = [];
  for (let k = 0; k < 8 && out.length < count; k++) {
    const a = ((e.sea.n * 3 + k * 3) % 8) * Math.PI / 4, r = out.length ? 1.6 : .2, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (w.water(hab, x, y)) out.push({ x, y });
  }
  e.sea.n++;
  return out;
}
function updateLeviathan(e, w, dt, d, s, p, hab, gap, struck, lost) {
  if (d.pattern === "tentacle") { // a summoned limb: slams when it rises, then on a short cadence, until it sinks
    s.life = (s.life ?? d.life) - dt;
    if (s.life <= 0 || w.ownerDead?.(e)) { e.dead = true; return; }
    if (s.phase === "lurk") { s.phase = "sway"; s.t = 0; }
    if (s.t <= d.telegraph) e.seaTele = { type: "slam" };
    if (s.t <= 0) { if (gap < d.reach) w.hurt(d.damage, e); s.t = d.every; }
    return;
  }
  if (d.pattern === "wyrm") { // weaves its long body toward the diver, then marks and makes a straight lunge
    if (gap > d.aggro + 6) return;
    if (s.phase === "lurk") { s.phase = "weave"; s.t = d.weaveFor; }
    if (s.phase === "weave") {
      s.n += dt; const m = gap || 1, ux = (p.x - e.x) / m, uy = (p.y - e.y) / m, sway = Math.sin(s.n * d.weave) * d.sway;
      if (!swimToward(e, w, hab, e.x + ux - uy * sway, e.y + uy + ux * sway, d.speed * dt)) swimToward(e, w, hab, p.x, p.y, d.speed * dt);
      if (gap < d.biteAt && s.cd <= 0) { w.hurt(d.damage, e); s.cd = 1.5; }
      if (s.t <= 0 && gap <= 2.5) { swimToward(e, w, hab, e.x - ux, e.y - uy, d.speed * 1.5 * dt); return; } // draw back to make room for the lunge
      if (s.t <= 0) { s.line = { type: "line", dx: (p.x - e.x) / m, dy: (p.y - e.y) / m, len: Math.min(d.reach, gap + 2) }; s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = s.line; }
      else if (gap < 2) e.seaTele = { type: "jaw" };
      return;
    }
    if (s.phase === "telegraph") { e.seaTele = s.line; face(e, s.line.dx, s.line.dy); if (s.t <= 0) { s.phase = "strike"; s.hit = false; s.done = 0; } return; }
    if (s.phase === "strike") {
      const step = d.lunge * dt, nx = e.x + s.line.dx * step, ny = e.y + s.line.dy * step;
      if (!w.water(hab, nx, ny) || s.done >= s.line.len) { s.phase = "rest"; s.t = d.rest; return; }
      e.x = nx; e.y = ny; s.done += step; if (!s.hit && dist(e, p) < 1.1) { s.hit = true; w.hurt(d.damage, e); }
      return;
    }
    if (s.t <= 0) { s.phase = "weave"; s.t = d.weaveFor; }
    return;
  }
  if (d.pattern === "whale") {
    if (struck) s.angry = true;
    if (!s.angry) { // calm: a slow drift that turns at the shore
      surface(e, true); s.dir ||= 1;
      if (!swimToward(e, w, hab, e.x + s.dir, e.y + Math.sin(e.x * .3) * .3, d.drift * dt)) s.dir *= -1;
      return;
    }
    if (gap > d.aggro + 6) return;
    if (s.phase === "lurk" || s.phase === "rest") { if (s.t > 0) return; surface(e, false); s.to = { x: p.x, y: p.y }; s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = { type: "shadow", x: s.to.x, y: s.to.y, big: true }; return; }
    if (s.phase === "telegraph") { e.seaTele = { type: "shadow", x: s.to.x, y: s.to.y, big: true }; if (s.t <= 0) { if (w.water(hab, s.to.x, s.to.y)) { e.x = s.to.x; e.y = s.to.y; } surface(e, true); if (dist(s.to, p) < 1.6) { w.hurt(d.damage, e); w.pull(e, -d.push); } s.phase = "rest"; s.t = d.rest; } }
    return;
  }
  if (d.pattern === "lunge") {
    if (gap > d.aggro + 6) return;
    if (s.phase === "lurk") { surface(e, false); e.seaTele = { type: "shadow", x: e.x, y: e.y }; swimToward(e, w, hab, p.x, p.y, d.stalk * dt); if (gap < d.lockAt) { s.to = { x: p.x, y: p.y }; s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = { type: "line", dx: (p.x - e.x) / (gap || 1), dy: (p.y - e.y) / (gap || 1), len: gap + 1.5 }; s.line = e.seaTele; } return; }
    if (s.phase === "telegraph") { e.seaTele = s.line; if (s.t <= 0) { surface(e, true); s.phase = "strike"; s.hit = false; s.done = 0; } return; }
    if (s.phase === "strike") {
      const step = d.speed * dt, nx = e.x + s.line.dx * step, ny = e.y + s.line.dy * step;
      if (!w.water(hab, nx, ny) || s.done >= s.line.len) { s.phase = "exposed"; s.t = d.exposed; return; }
      e.x = nx; e.y = ny; s.done += step; face(e, s.line.dx, s.line.dy);
      if (!s.hit && dist(e, p) < 1.1) { s.hit = true; w.hurt(d.damage, e); }
      return;
    }
    if (s.t <= 0) { s.phase = "lurk"; surface(e, false); } // exposed: the window to strike back
    return;
  }
  // krakens: a surfaced body that drifts toward the Wayfarer
  surface(e, true);
  if (gap > d.aggro + 6) return;
  if (gap > 3) swimToward(e, w, hab, p.x, p.y, (d.drift || .5) * dt);
  if (d.pattern === "grab") {
    if (s.phase === "lurk") { if (s.t <= 0 && gap < d.aggro) { s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = { type: "mark" }; } return; }
    if (s.phase === "telegraph") { e.seaTele = { type: "mark" }; if (s.t <= 0) { s.phase = "hold"; s.t = d.hold; s.broken = 0; } return; }
    if (s.phase === "hold") {
      e.seaTele = { type: "grip" }; s.broken += Math.max(0, lost);
      if (s.broken >= d.breakAt || s.t <= 0) { s.phase = "lurk"; s.t = d.rest; return; }
      w.pull(e, d.drag * dt);
      if (gap < d.biteAt && s.cd <= 0) { w.hurt(d.damage, e); s.cd = 1; }
    }
    return;
  }
  // reef / storm: tentacles in marked rings, and for the storm an ink cloud
  if (d.pattern === "storm") { s.ink = (s.ink ?? d.inkEvery) - dt; if (s.ink <= 0 && gap < d.aggro) { s.ink = d.inkEvery; w.ink?.(d.ink); } }
  if (s.phase === "lurk") { const room = d.maxTentacles - (w.tentacles?.(e) || 0); if (s.t <= 0 && gap < d.aggro && room > 0) { s.marks = rings(e, w, hab, Math.min(d.tentacles, room)); if (s.marks.length) { s.phase = "telegraph"; s.t = d.telegraph; e.seaTele = { type: "rings", marks: s.marks }; } } return; }
  if (s.phase === "telegraph") { e.seaTele = { type: "rings", marks: s.marks }; if (s.t <= 0) { for (const m of s.marks) w.summon?.("tentacle", m.x, m.y, e); s.phase = "lurk"; s.t = d.every; } }
}
// First fell of each leviathan kind: a one-time trophy (idempotent; recorded in worldFlags).
export const LEVIATHAN_TROPHY = { currency: 40, material: "weaponSphere" };
export function leviathanTrophy(save, kind) {
  if (!SEA_CREATURES[kind]?.leviathan) return false;
  save.worldFlags ||= {};
  const key = `leviathan:${kind}`;
  if (save.worldFlags[key]) return false;
  save.worldFlags[key] = true;
  save.currency = (save.currency || 0) + LEVIATHAN_TROPHY.currency;
  save.materials ||= {}; save.materials[LEVIATHAN_TROPHY.material] = (save.materials[LEVIATHAN_TROPHY.material] || 0) + 1;
  return true;
}
