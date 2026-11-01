// Elite affixes, champion auras and shamans (release 657; Tim, 2026-11-01: "champions or elites that buff the monsters around
// them in their pack... reduced damage or... extra damage... invulnerable monsters that are tied to another monster... a shaman...
// invulnerable to damage until you kill the shaman... positioned away... a ring around him when he's casting"; "the monster
// elites should have affixes... enraged... volcanic... sky assault... orbital lasers come down from time to time... drone assault,
// where the monster has... drones around it... spikes [that] track the character every 1 or 2 seconds... you can dodge it... if you
// stand still... you'll just take the hit").
//
// - Affixes (`AFFIXES`): a Fractured champion pack's leader carries one, a rare leader two, and every crossing guardian one (hashed
//   from its id, so the same guardian always has the same). Each acts on its own clock while the Wayfarer is within `reach`:
//   Volcanic drops burning ground where the Wayfarer stands; Sky Assault marks the spot and a lance of light falls on it; Spiked sends a
//   spike up under the Wayfarer every `every` s (keep moving); Venomous spits a poison pool; Drone Swarm keeps `count` drones
//   orbiting it that take turns shooting; Enraged grows bigger, faster and fiercer once below `below` of its health. Every strike is
//   telegraphed (`arm` s) and a dodge passes through it.
// - Aura (`AURA`): while a champion or rare leader lives, its packmates within `radius` take `reduce` less damage and deal `damage`×.
// - Shaman (`SHAMAN`): now and then a pack has a shaman standing apart, channelling; while it lives, its packmates within `radius` of
//   it cannot be harmed (a ward shimmers round them, a ring round the shaman). Kill the shaman first.
// Runtime state on the creatures (`affixClock`, `inAura`, `wardedBy`) and in game.affixHazards (never saved; at most `maxHazards`).
import { hashSeed } from "./random.js?v=r671-f17aaa06b7f6";

export const AFFIXES = {
  volcanic: { name: "Volcanic", color: "#ff6a2a", every: 3.2, arm: .8, radius: 1.15, life: 4, dps: .35 },
  skyAssault: { name: "Sky Assault", color: "#8fd8ff", every: 4, arm: 1.1, radius: 1, damage: .9 },
  spiked: { name: "Spiked", color: "#e2cfa4", every: 1.5, arm: .55, radius: .7, damage: .55 },
  venomous: { name: "Venomous", color: "#9dff6a", every: 3.6, arm: .6, radius: 1.25, life: 3.5, poison: [5, 3] },
  droneSwarm: { name: "Drone Swarm", color: "#c8ff7a", count: 3, orbit: 1.35, spin: 2.2, every: 1.6, damage: .3, speed: 6.5, life: 1.6 },
  enraged: { name: "Enraged", color: "#ff3b3b", below: .5, scale: 1.2, damage: 1.5, speed: 1.3 },
};
export const AFFIX_IDS = Object.keys(AFFIXES);
export const AFFIX_TUNING = { reach: 11, maxHazards: 30, burst: .25 };
export const AURA = { radius: 5, reduce: .3, damage: 1.2 };
export const SHAMAN = { chance: .2, kind: "sparkWarden", distance: [5, 7], radius: 11, hp: 1.6, speed: .3 };

// `n` different affixes for `key` (the same key always gives the same).
export function rollAffixes(key, n) { return [...AFFIX_IDS].sort((a, b) => hashSeed(`${key}:affix:${a}`) - hashSeed(`${key}:affix:${b}`)).slice(0, n); }
export const affixNames = (e) => (e?.affixes || []).map((a) => AFFIXES[a]?.name).filter(Boolean);
// Where drone `i` of a Drone Swarm creature orbits at time `t` (s).
export function dronePos(e, i, t) { const D = AFFIXES.droneSwarm, a = t * D.spin + i * Math.PI * 2 / D.count; return { x: e.x + .5 + Math.cos(a) * D.orbit, y: e.y + .3 + Math.sin(a) * D.orbit * .6 }; }

// One frame. `hurt(amount)` hurts the Wayfarer (the game applies dodges, invulnerability and armour); `poison(seconds, dps)`.
export function tickAffixes(game, dt, now, hurt, poison) {
  const p = game.player, px = p.x + .5, py = p.y + .45, t = now / 1000, T = AFFIX_TUNING, hz = (game.affixHazards ||= []);
  const live = game.enemies.filter((e) => !e.dead && e.hp > 0);
  for (const e of live) {
    // Aura and ward: the pack's leader and shaman.
    if (e.auraBy) { const lead = live.find((q) => q.id === e.auraBy), on = !!lead && Math.hypot(lead.x - e.x, lead.y - e.y) <= AURA.radius;
      if (on && e.lastHp != null && e.hp < e.lastHp) e.hp = Math.min(e.maxHp, e.hp + (e.lastHp - e.hp) * AURA.reduce);
      if (on && !e.inAura) { e.auraBase = e.damage; e.damage = Math.max(1, Math.round(e.damage * AURA.damage)); e.inAura = true; } else if (!on && e.inAura) { e.damage = e.auraBase ?? e.damage; e.inAura = false; } }
    if (e.wardBy) { const sh = live.find((q) => q.id === e.wardBy), on = !!sh && Math.hypot(sh.x - e.x, sh.y - e.y) <= SHAMAN.radius;
      if (on && !e.warded) { e.warded = true; e.untargetable = true; } else if (!on && e.warded) { e.warded = false; e.untargetable = false; } }
    e.lastHp = e.hp;
    if (!e.affixes?.length) continue;
    if (e.affixes.includes("enraged") && !e.enragedOn && e.hp < e.maxHp * AFFIXES.enraged.below) { const R = AFFIXES.enraged; e.enragedOn = true; e.scale = (e.scale || 1) * R.scale; e.damage = Math.max(1, Math.round(e.damage * R.damage)); e.speedMultiplier = (e.speedMultiplier || 1) * R.speed; }
    if (Math.hypot(e.x + .5 - px, e.y + .45 - py) > T.reach || e.retreating || e.untargetable && !e.warded) continue;
    const clock = (e.affixClock ||= {});
    for (const id of e.affixes) {
      const A = AFFIXES[id]; if (!A?.every) continue;
      if (clock[id] == null) clock[id] = now + (hashSeed(`${e.id}:${id}`) % 1000); // staggered starts
      if (now < clock[id]) continue; clock[id] = now + A.every * 1000;
      if (id === "droneSwarm") { const k = (e.droneTurn = ((e.droneTurn || 0) + 1) % A.count), d = dronePos(e, k, t), dx = px - d.x, dy = py - d.y, n = Math.hypot(dx, dy) || 1;
        game.projectiles.push({ id: `drone-shot-${e.id}-${now}`, x: d.x, y: d.y, dx: dx / n, dy: dy / n, speed: A.speed, life: A.life, damage: Math.max(1, Math.round(e.damage * A.damage)), hostile: true, path: "straight", age: 0, hits: {}, affixShot: true }); continue; }
      if (hz.length >= T.maxHazards) continue;
      hz.push({ kind: id, x: px, y: py, radius: A.radius, armAt: now + A.arm * 1000, until: now + (A.arm + (A.life || T.burst)) * 1000, damage: Math.max(1, Math.round(e.damage * (A.damage || A.dps || 0))), by: e.id, struck: false });
    }
  }
  // The hazards: a burst strikes once as it lands; burning ground and poison pools keep hurting while stood in.
  for (const h of hz) {
    if (now < h.armAt) continue; const inside = Math.hypot(px - h.x, py - h.y) <= h.radius;
    if (h.kind === "volcanic") { if (inside && now >= (h.nextTick || 0)) { h.nextTick = now + 1000; hurt(h.damage); } }
    else if (h.kind === "venomous") { if (inside && now >= (h.nextTick || 0)) { h.nextTick = now + 1000; poison(...AFFIXES.venomous.poison); } }
    else if (!h.struck) { h.struck = true; if (inside) hurt(h.damage); }
  }
  game.affixHazards = hz.filter((h) => now < h.until);
}
