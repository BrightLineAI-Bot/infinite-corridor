// New dungeon traps (release 523; Tim, 2026-10-28: "these enemies... lanterns... shoot out like a bunch of different balls,
// and then they land on the floor and... spin for a second, and they shoot out in pentagram patterns, let's have some traps
// that launch things like that. Additionally... Lava traps so that when you... step on them, they... explode, or... launch
// lava in the air... And... dart traps that shoot darts from across the wall... 3 projectiles").
//
// Three trap kinds, placed only in crossings first generated from this release on (history.trapsVersion, set in
// generatePinnedDungeon); crossings found before keep exactly their old traps.
// - sigil: a pentagram etched in the floor. Stepped near, it flares, then lobs `seeds` orbs that land in a ring round it,
//   spin for `spin` s and each fire `points` shots outward in a five-pointed star.
// - lava: a cracked vent. Stepped on, it glows, then bursts (`blast`) and flings `blobs` gobbets of lava that splash where
//   they land, like the lava geysers.
// - dart: a slit in a wall. Crossing its line within `range` tiles, it fires `darts` darts across the room, `gap` s apart.
// Every trap warns before it fires (`warn` s) and rests after (`rest` s). Jumping clears star shots and darts, as it clears
// the old traps; lava blobs must be dodged. Damage is `base` + `perLevel` × the Wayfarer's level. Pure rules and data;
// game.ts calls tickNewTraps, main.ts draws them.
import { hashSeed } from "./random.js?v=r543-bf7392de2693";

// Release 525 (Tim: "the trap should do more damage. All across the board... the pitfall trap... you trigger it. And... two
// seconds before the ground falls out. And you die if you stay on the ground. But you can just move"): every trap hits for
// at least `share` of the Wayfarer's maximum health (the old fire, spike and gas traps too: TRAP_DAMAGE_SHARE), and version
// 2 adds the pit. Crossings stamped with version 1 keep their three kinds and placement.
export const DUNGEON_TRAPS = {
  version: 3, count: [2, 4], minFromEntry: 6, spacing: 4,
  sigil: { radius: .8, warn: .6, rest: 4.5, seeds: 5, ring: 2.4, flight: .45, spin: 1, points: 5, speed: 4.6, life: 1.7, base: 5, perLevel: .35, share: .05 },
  lava: { radius: .7, warn: .55, rest: 3.5, blast: 1.35, blobs: 4, reach: 3.2, speed: 6, base: 8, perLevel: .6, blobShare: .7, share: .14 },
  dart: { range: 8, side: .6, warn: .35, rest: 2.6, darts: 3, gap: .16, speed: 10, life: 1.1, base: 5, perLevel: .4, share: .07 },
  pit: { radius: .7, warn: 2, open: 3, rest: 3, size: .85 },
  // Release 527 (Tim: "traps that... pull you... if you trigger the trap [and] stay in it for too long... it'll pull you
  // into... an explosion... one of those grenade kind of... explosion things where it explodes all over"): a rune ring of
  // `radius`. Stand in it for `hold` s and it drags you to its eye (`pull` tiles/s, for `pullTime` s, walls stop you), then
  // bursts (`blast`, `share` of maximum health) and sprays `frags` grenade fragments (`fragShare` each). Step out in time
  // and it fades back to sleep.
  vortex: { radius: 1.5, hold: 1.1, pull: 5, pullTime: .7, blast: 1.6, frags: 6, fragReach: 3, speed: 6.5, rest: 4, base: 10, perLevel: .7, share: .18, fragShare: .35 },
};
export const TRAP_DAMAGE_SHARE = .12; // the old fire, spike and gas traps: at least this share of maximum health per hit
export const TRAP_KINDS_BY_VERSION = { 1: ["sigil", "lava", "dart"], 2: ["sigil", "lava", "dart", "pit"], 3: ["sigil", "lava", "dart", "pit", "vortex"] };
export const NEW_TRAP_KINDS = TRAP_KINDS_BY_VERSION[DUNGEON_TRAPS.version];
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Places the new traps once (map.newTrapsPlaced). Floor tiles away from the entry, objects and each other; a dart trap
// sits on a floor tile against a wall and faces away from it.
export function addNewTraps(map, seed, id, version = DUNGEON_TRAPS.version) {
  if (!map?.tiles?.length || map.arena || map.newTrapsPlaced) return [];
  map.newTrapsPlaced = true;
  const w = map.width || Math.round(Math.sqrt(map.tiles.length)), at = (x, y) => map.tiles[y * w + x];
  const entry = map.entry || { x: 2, y: 2 }, objects = (map.objects ||= []), used = objects.filter((o) => Number.isFinite(o?.x) && Number.isFinite(o?.y));
  const T = DUNGEON_TRAPS, kinds = TRAP_KINDS_BY_VERSION[version] || TRAP_KINDS_BY_VERSION[1], h = (s) => hashSeed(`${seed}:new-traps:v${version === 1 ? 1 : version}:${id}:${s}`);
  const want = T.count[0] + (h("count") % (T.count[1] - T.count[0] + 1));
  const floor = (t) => t && !t.blocked && !t.environment && !t.structure && !["bridge", "sealedGate", "dungeonWater", "canyon", "lava", "river"].includes(t.kind);
  const candidates = map.tiles.filter((t) => floor(t) && t.x > 0 && t.y > 0 && t.x < w - 1 && Math.hypot(t.x - entry.x, t.y - entry.y) >= T.minFromEntry && used.every((q) => Math.hypot(t.x - q.x, t.y - q.y) >= 2.5))
    .sort((a, b) => h(`${a.x},${a.y}`) - h(`${b.x},${b.y}`));
  const placed = [], free = (t) => !placed.some((q) => Math.hypot(t.x - q.x, t.y - q.y) < T.spacing);
  const wallOf = (t) => N4.find(([dx, dy]) => at(t.x + dx, t.y + dy)?.blocked && floor(at(t.x - dx, t.y - dy)));
  for (let n = 0; n < want; n++) {
    let kind = kinds[h(`kind:${n}`) % kinds.length];
    // A dart trap takes the first free tile against a wall; the others the first free tile.
    let t = kind === "dart" ? candidates.find((q) => free(q) && wallOf(q)) : null;
    if (!t) { if (kind === "dart") kind = "sigil"; t = candidates.find(free); }
    if (!t) break;
    const wall = kind === "dart" ? wallOf(t) : null;
    const trap = { id: `${id}:new-trap:${n}`, kind: "trap", trapType: kind, newTrap: version, x: t.x, y: t.y, phase: "armed", timer: 0, ...(wall ? { dirX: -wall[0], dirY: -wall[1] } : {}) };
    objects.push(trap); placed.push(trap);
  }
  return placed;
}

const damageOf = (kind, level, maxHp = 0) => { const K = DUNGEON_TRAPS[kind]; return Math.max(1, Math.round(Math.max(K.base + K.perLevel * Math.max(1, Number(level) || 1), (K.share || 0) * (Number(maxHp) || 0)))); };
const shot = (id, x, y, a, speed, life, damage, extra = {}) => ({ id, x, y, dx: Math.cos(a), dy: Math.sin(a), speed, life, damage, hostile: true, hits: {}, path: "straight", trapShot: true, ...extra });

// One frame of the new traps. `world`: { player, level, maxHp, now, projectiles, effects, seeds, open?, airborne?, fall? }
// (airborne: jumping, boosting or in Aerial Step, so an open pit is passed over; fall(): the Wayfarer drops into a pit;
// pull(dx, dy): the vortex drags the Wayfarer, stopped by walls). Seeds: the sigil orbs,
// kept by the game; open(x, y): whether a point is open floor, so orbs land short of walls). Returns nothing; it pushes hostile projectiles and effects the game already resolves against the
// Wayfarer.
export function tickNewTraps(objects, world, dt) {
  const { player, level, maxHp, now } = world, px = player.x, py = player.y, T = DUNGEON_TRAPS;
  for (const trap of objects || []) {
    if (trap?.kind !== "trap" || !trap.newTrap) continue;
    const K = T[trap.trapType]; if (!K) continue;
    trap.timer = Math.max(0, (Number(trap.timer) || 0) - dt);
    if (trap.phase === "armed") {
      let near;
      if (trap.trapType === "dart") { const ox = px - trap.x, oy = py - trap.y, f = ox * trap.dirX + oy * trap.dirY, side = Math.abs(ox * -trap.dirY + oy * trap.dirX); near = f > .3 && f <= K.range && side < K.side; }
      else near = Math.hypot(px - trap.x, py - trap.y) < K.radius;
      if (near && trap.trapType === "pit") { trap.phase = "warning"; trap.timer = K.warn; continue; } // the floor cracks: two seconds to step off
      if (near) { trap.phase = "warning"; trap.timer = K.warn ?? K.hold; }
    } else if (trap.trapType === "vortex") {
      const cx = trap.x + .5, cy = trap.y + .5, dx = cx - (px + .5), dy = cy - (py + .75), d = Math.hypot(dx, dy);
      if (trap.phase === "warning" && d > K.radius) { trap.phase = "rest"; trap.timer = .8; } // stepped out in time
      else if (trap.phase === "warning" && trap.timer <= 0) { trap.phase = "pulling"; trap.timer = K.pullTime; }
      else if (trap.phase === "pulling") {
        if (d > .15) { const step = Math.min(d, K.pull * dt); world.pull?.(dx / d * step, dy / d * step); }
        if (trap.timer <= 0) {
          trap.phase = "rest"; trap.timer = K.rest; trap.fired = (trap.fired || 0) + 1;
          const dmg = damageOf("vortex", level, maxHp), tag = `${trap.id}:${trap.fired}`;
          world.effects.push({ id: `${tag}:burst`, kind: "enemy-blast", x: cx, y: cy, life: .35, radius: K.blast, untilPulse: 0, pulse: 99, damage: dmg, hostile: true, hits: {} });
          for (let i = 0; i < K.frags; i++) { const a = i * Math.PI * 2 / K.frags + (hashSeed(`${tag}:a`) % 100) / 100; world.projectiles.push(shot(`${tag}:frag:${i}`, cx, cy, a, K.speed, K.fragReach / K.speed, Math.round(dmg * K.fragShare), { path: "grenade", blastRadius: .9 })); }
        }
      } else if (trap.phase === "rest" && trap.timer <= 0) trap.phase = "armed";
      continue;
    } else if (trap.trapType === "pit") {
      if (trap.phase === "warning" && trap.timer <= 0) { trap.phase = "open"; trap.timer = K.open; }
      else if (trap.phase === "open") { if (Math.abs(px - trap.x) < K.size * .75 && Math.abs(py - trap.y) < K.size * .75 && !world.airborne) world.fall?.(trap); if (trap.timer <= 0) { trap.phase = "rest"; trap.timer = K.rest; } }
      else if (trap.phase === "rest" && trap.timer <= 0) trap.phase = "armed";
      continue;
    } else if (trap.phase === "warning" && trap.timer <= 0) {
      trap.phase = "rest"; trap.timer = K.rest; trap.fired = (trap.fired || 0) + 1;
      const cx = trap.x + .5, cy = trap.y + .5, dmg = damageOf(trap.trapType, level, maxHp), tag = `${trap.id}:${trap.fired}`;
      if (trap.trapType === "sigil") {
        const turn = (hashSeed(tag) % 360) * Math.PI / 180;
        for (let i = 0; i < K.seeds; i++) { const a = turn + i * Math.PI * 2 / K.seeds; let r = K.ring; while (r > .5 && world.open && !world.open(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) r -= .4; /* an orb lands on open floor, short of a wall */ world.seeds.push({ id: `${tag}:seed:${i}`, x: cx, y: cy, fx: cx, fy: cy, tx: cx + Math.cos(a) * r, ty: cy + Math.sin(a) * r, t: 0, spin: a, damage: dmg }); }
      } else if (trap.trapType === "lava") {
        world.effects.push({ id: `${tag}:burst`, kind: "enemy-blast", lava: true, x: cx, y: cy, life: .35, radius: K.blast, untilPulse: 0, pulse: 99, damage: dmg, hostile: true, hits: {} });
        for (let i = 0; i < K.blobs; i++) { const a = (hashSeed(`${tag}:a${i}`) % 628) / 100, r = 1.2 + (hashSeed(`${tag}:r${i}`) % 100) / 100 * (K.reach - 1.2); world.projectiles.push(shot(`${tag}:blob:${i}`, cx, cy, a, K.speed, r / K.speed, Math.round(dmg * K.blobShare), { path: "grenade", blastRadius: 1, lava: true })); }
      } else if (trap.trapType === "dart") {
        trap.volley = { left: K.darts, next: 0, tag, dmg };
      }
    } else if (trap.phase === "rest" && trap.timer <= 0) { trap.phase = "armed"; trap.volley = null; }
    const v = trap.volley; // the dart trap's volley, one dart every `gap` s
    if (v && v.left > 0 && (v.next -= dt) <= 0) {
      const a = Math.atan2(trap.dirY, trap.dirX);
      world.projectiles.push(shot(`${v.tag}:dart:${K.darts - v.left}`, trap.x + .5 + trap.dirX * .3, trap.y + .5 + trap.dirY * .3, a, K.speed, K.life, v.dmg, { jumpable: true, dart: true }));
      v.left -= 1; v.next = K.gap;
    }
  }
  // Sigil orbs: fly to their spot, spin, then fire a five-pointed star.
  const S = T.sigil;
  for (const s of world.seeds) {
    s.t += dt;
    const k = Math.min(1, s.t / S.flight); s.x = s.fx + (s.tx - s.fx) * k; s.y = s.fy + (s.ty - s.fy) * k;
    if (s.t >= S.flight + S.spin && !s.fired) {
      s.fired = true;
      for (let i = 0; i < S.points; i++) world.projectiles.push(shot(`${s.id}:star:${i}`, s.x, s.y, s.spin + i * Math.PI * 2 / S.points, S.speed, S.life, s.damage, { jumpable: true, sigilStar: true }));
    }
  }
  world.seeds.splice(0, world.seeds.length, ...world.seeds.filter((s) => !s.fired));
}
