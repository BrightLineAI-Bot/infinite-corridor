// The guardian and elite kit (release 668; Tim, 2026-11-01: the crossing guardians "just stand there and take the hits"; they
// hit hard and have big health, but their fights aren't impactful. Give guardians and elites varied movesets, more aggression
// and adds that spawn during the fight, so these become real boss moments, kept below world-boss difficulty).
//
// - Who (`kitRole`): a dungeon guardian (a crossing guardian, gate warden, objective or wing guardian, final boss) is a
//   "guardian"; an elite, a Margin Warden or a Fractured champion or rare is an "elite". World beasts, the Questing Beast, Far
//   Array bosses, Gate Revenants, Fracture Wardens, summons and reflections are left as they are.
// - Moveset: a pack creature gains `modules` more attack modules from `pool` (hashed from its id, so the same creature always
//   has the same). Every kit creature also gains `moves` signature moves from `KIT_MOVES`, telegraphed hazards that run on
//   their own clocks while the Wayfarer is within `reach` (drawn and struck through the affix hazards, `game.affixHazards`).
// - Aggression: a shorter pause between attacks (`attackGap`, never lengthened), cooldowns × `cooldown`, speed × `speed`.
// - Adds: as its health falls past each `adds.at` share it calls `adds.size` of the area's creatures round itself (never more
//   than `adds.cap` of its own alive). They are summons: no rewards, and they go when it falls.
// Runtime only: `kitRole`, `kitMoves`, `kitClock`, `kitCalls` on the creature, additive.
import { hashSeed } from "./random.js?v=r686-71f56fc9e685";

export const BOSS_KIT = {
  guardian: { modules: 3, moves: 2, attackGap: .35, cooldown: .8, speed: 1.08, adds: { at: [.75, .5, .25], size: [2, 3], cap: 6 } },
  elite: { modules: 2, moves: 1, attackGap: .45, cooldown: .85, speed: 1.05, adds: { at: [.5], size: [2, 2], cap: 4 } },
  pool: ["leapSlam", "ramCharge", "sigilScatter", "spikeVolley", "groundRupture", "shockwave", "mortarVolley", "sweepBeam", "blinkStrike", "clawSweep"],
  reach: 9, maxHazards: 30, near: [1.5, 3], // adds come up this far from it
};
// Signature moves (shaped like AFFIXES so the affix hazards draw and strike them): `at` "self" rings its own feet, "player" marks
// where the Wayfarer stands (`count` marks, one on them and the rest `spread` round them), "line" lays `count` marks from it to them.
export const KIT_MOVES = {
  quake: { name: "Quake", color: "#ff9a5a", every: 6.5, arm: .9, radius: 2.6, damage: 1, at: "self", count: 1 },
  barrage: { name: "Barrage", color: "#ffcf6a", every: 7.5, arm: 1, radius: 1.1, damage: .8, at: "player", count: 3, spread: 1.8 },
  crossfire: { name: "Crossfire", color: "#c08aff", every: 8, arm: .9, radius: .9, damage: .8, at: "line", count: 4 },
  meteor: { name: "Meteor", color: "#ff6a6a", every: 9, arm: 1.4, radius: 1.8, damage: 1.3, at: "player", count: 1, spread: 0 },
};
export const KIT_MOVE_IDS = Object.keys(KIT_MOVES);
const GUARDIAN_ROLES = ["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss"];

export function kitRole(e) {
  if (!e || e.worldBeast || e.questingBeast || e.farArrayBoss || e.farArraySummon || e.gatePredator || e.fracWarden || e.summonedBy || e.illusion || e.mirrorClone || e.ambient || e.passiveBehavior || e.astralCompanionOf || e.seaKind) return null;
  if (GUARDIAN_ROLES.includes(e.dungeonRole) || e.packGuardian) return "guardian";
  if (e.eliteId || e.marginWarden || ((e.fracRank === "champion" || e.fracRank === "rare") && e.affixes?.length && !e.fracReinforcement)) return "elite"; // a champion pack's leader, not every member
  return null;
}
// Apply the kit to a creature as it is made. `isPack(kind)` says whether it fights with attack modules.
export function applyBossKit(c, seed, isPack = () => false) {
  const role = kitRole(c); if (!role || c.kitRole) return c;
  const K = BOSS_KIT[role], h = (k) => hashSeed(`${seed}:boss-kit:${c.id}:${k}`);
  c.kitRole = role;
  if (isPack(c.kind) && Array.isArray(c.packAttacks)) { const extra = BOSS_KIT.pool.filter((a) => !c.packAttacks.includes(a)).sort((a, b) => h(a) - h(b)).slice(0, K.modules); c.packAttacks = [...c.packAttacks, ...extra]; }
  c.kitMoves = [...KIT_MOVE_IDS].sort((a, b) => h(`m${a}`) - h(`m${b}`)).slice(0, K.moves);
  c.attackGap = Math.min(Number.isFinite(c.attackGap) ? c.attackGap : 9, K.attackGap);
  c.attackCooldownScale = (Number(c.attackCooldownScale) || 1) * K.cooldown; c.speedMultiplier = (Number(c.speedMultiplier) || 1) * K.speed;
  return c;
}
// One frame. `spawnAdds(e, n)` calls n of the area's creatures round e and returns how many came.
export function tickBossKit(game, dt, now, spawnAdds) {
  const p = game.player, px = p.x + .5, py = p.y + .45, hz = (game.affixHazards ||= []);
  for (const e of game.enemies) {
    if (e.dead || !(e.hp > 0) || !e.kitRole || e.retreating) continue;
    const K = BOSS_KIT[e.kitRole], d = Math.hypot(e.x + .5 - px, e.y + .45 - py);
    if (!e.aggro && d > 7) continue; // it has to be in the fight
    // Adds as its health falls past each threshold (each once).
    const share = e.hp / Math.max(1, e.maxHp), calls = Number(e.kitCalls) || 0;
    if (calls < K.adds.at.length && share <= K.adds.at[calls] && d <= BOSS_KIT.reach * 1.5) {
      e.kitCalls = calls + 1;
      const mine = game.enemies.filter((q) => !q.dead && q.kitAddOf === e.id).length, [lo, hi] = K.adds.size, n = Math.min(K.adds.cap - mine, lo + hashSeed(`${e.id}:kit-call:${calls}`) % (hi - lo + 1));
      if (n > 0) spawnAdds(e, n);
    }
    if (!e.kitMoves?.length || d > BOSS_KIT.reach || (e.untargetable && !e.warded)) continue;
    const clock = (e.kitClock ||= {});
    for (const id of e.kitMoves) {
      const M = KIT_MOVES[id]; if (!M) continue;
      if (clock[id] == null) clock[id] = now + 2000 + (hashSeed(`${e.id}:kit:${id}`) % 3000); // a moment in, staggered
      if (now < clock[id]) continue; clock[id] = now + M.every * 1000;
      const dmg = Math.max(1, Math.round((Number(e.damage) || 1) * M.damage)), spots = [];
      if (M.at === "self") spots.push({ x: e.x + .5, y: e.y + .45 });
      else if (M.at === "line") for (let i = 1; i <= M.count; i++) spots.push({ x: e.x + .5 + (px - e.x - .5) * i / M.count, y: e.y + .45 + (py - e.y - .45) * i / M.count });
      else { spots.push({ x: px, y: py }); const turn = (hashSeed(`${e.id}:${id}:${now}`) % 628) / 100; for (let i = 1; i < M.count; i++) { const a = turn + i * Math.PI * 2 / (M.count - 1); spots.push({ x: px + Math.cos(a) * M.spread, y: py + Math.sin(a) * M.spread }); } }
      for (const q of spots) { if (hz.length >= BOSS_KIT.maxHazards) break; hz.push({ kind: id, x: q.x, y: q.y, radius: M.radius, armAt: now + M.arm * 1000, until: now + (M.arm + .25) * 1000, damage: dmg, by: e.id, struck: false }); }
    }
  }
  // Its adds go when it falls.
  for (const q of game.enemies) if (!q.dead && q.kitAddOf && !game.enemies.some((o) => o.id === q.kitAddOf && !o.dead)) { q.dead = true; q.noRewards = true; q.rewarded = true; }
}
