// Surface sea creatures (water world W3, docs/water-world-design.md). They live only in water, spawn deterministically
// per section from its water tiles (landscape version 2+), and move by their own patterns instead of land pathfinding:
//   line   Lanceeel: surfaces, shows its wake line, then charges straight along it and dives.
//   orbit  Ringcoil Serpent: circles the Wayfarer, tightening until it bites; a hit throws the coil wide.
//   sine   Sinewake Serpent: weaves toward the Wayfarer in an S, segmented body, bites and backs off.
//   leap   Breachfin: marks a landing shadow, leaps out in an arc (only hittable while airborne) and crashes down.
//   hop    Mire Leech (swamps): short hops through bog water, nips on contact.
//   ambush Bog Lurker (swamps): hidden in the mire, bubbles, then bites and drags the Wayfarer a tile closer.
// Every strike is telegraphed first; submerged creatures are hidden and untargetable. Data and pure rules: game.ts
// supplies the world (water test, hurt, pull) and calls `updateSeaCreature` from its enemy loop.
import { hashSeed } from "./random.ts";

export const SEA_HABITATS = {
  open: ["ocean", "deepOcean", "lakeWater"],
  swamp: ["swampWater", "mireWater", "toxicMire", "toxicWater"],
};
export const SEA_CREATURES = {
  lanceeel: { name: "Lanceeel", habitat: "open", pattern: "line", hp: 26, damage: 9, xp: 14, aggro: 7, telegraph: .9, speed: 7, reach: 8, rest: 2.2, segments: 3, colors: ["#5f8fa8", "#1c3442", "#d6f3ff"] },
  ringcoil: { name: "Ringcoil Serpent", habitat: "open", pattern: "orbit", hp: 40, damage: 8, xp: 18, aggro: 8, radius: 4.5, tighten: .35, spin: 1.1, speed: 4, biteAt: 1.2, segments: 5, colors: ["#3f7a62", "#173026", "#c9f2b0"] },
  sinewake: { name: "Sinewake Serpent", habitat: "open", pattern: "sine", hp: 55, damage: 11, xp: 24, aggro: 9, speed: 2.2, weave: 3, sway: 2.2, biteAt: .9, rest: 1.6, segments: 7, colors: ["#6b4f8a", "#221832", "#e0c8ff"] },
  breachfin: { name: "Breachfin", habitat: "open", pattern: "leap", hp: 30, damage: 12, xp: 16, aggro: 7, telegraph: .8, air: .9, splash: 1, rest: 1.8, segments: 1, colors: ["#9aa7b5", "#2b3440", "#f4f8ff"] },
  mireLeech: { name: "Mire Leech", habitat: "swamp", pattern: "hop", hp: 14, damage: 4, xp: 6, aggro: 6, hop: .9, every: .7, biteAt: .7, rest: 1, segments: 2, colors: ["#4d4a2a", "#1d1c10", "#c4c27a"] },
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
  return out;
}

// Fields a sea creature carries on top of an ordinary combatant.
export function seaCombatantFields(kind) {
  const d = SEA_CREATURES[kind];
  return { seaKind: kind, name: d.name, hp: d.hp, maxHp: d.hp, damage: d.damage, range: 0, xpValue: d.xp, segments: d.segments, segmentSpacing: .32, scale: 1, bodyRadius: .4,
    hidden: ["line", "leap", "ambush"].includes(d.pattern), untargetable: ["line", "leap", "ambush"].includes(d.pattern), sea: { phase: "lurk", t: 0, cd: 0, n: 0, ang: 0, r: d.radius || 0, dir: 1, lastHp: d.hp } };
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
  const struck = e.hp < s.lastHp; s.lastHp = e.hp;
  e.seaTele = null;
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
