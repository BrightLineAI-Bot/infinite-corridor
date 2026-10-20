// World beasts (release 235; Tim, 2026-10-19: "more monsters similar to the Questing Beast … strong … varied moves and
// attacks … hyper-aggressive … crazy amounts of health … roaming world bosses … you still get three tries"). Each one
// works the way the Questing Beast does (src/questing-beast.ts, which is left as it was): now and then it claims a wild
// section; it stays until it is killed or it has killed the Wayfarer `tries` times; then it is gone, and after a
// cooldown counted in sections entered a new hunt can begin somewhere else. Its health and blows are tuned to the
// Wayfarer's power. The creature itself (body, attacks, brain) is a Monster Pack entry; this module holds only the hunt.
import { hashSeed } from "./random.ts";
import { LETHAL_KINDS } from "./landscape.ts";

// One row per beast. `kind` is its MONSTER_PACK id. Balance lives here.
export const WORLD_BEASTS = {
  morphingBlob: {
    kind: "morphingBlob", name: "The Morphing Blob", chance: .03, minDepth: 5, tries: 3, cooldownSlain: 20, cooldownEscaped: 26,
    hitsToKill: 70, hpPerLevel: 30, damageShare: .22, speed: 1, attackGap: .18, staggerResistance: .95, rewardMarks: 170, rewardPerLevel: 17,
    arrive: "Something wet and enormous has settled over this ground. The Morphing Blob is here.",
    slain: "The Morphing Blob shudders, sags and runs away into the soil.",
    gone: "The Morphing Blob has fed enough on you, and seeps away. In time it will settle somewhere else.",
  },
};
export const WORLD_BEAST_IDS = Object.keys(WORLD_BEASTS);
export const isWorldBeastKind = (kind) => WORLD_BEAST_IDS.some((id) => WORLD_BEASTS[id].kind === kind);

// save.worldBeasts: { id: { cycle, cooldown, active: { rx, ry, tries } | null, slain, escaped } } (additive; unknown ids kept).
export function ensureWorldBeasts(save) {
  const all = save.worldBeasts && typeof save.worldBeasts === "object" ? { ...save.worldBeasts } : {};
  for (const id of WORLD_BEAST_IDS) {
    const q = all[id] && typeof all[id] === "object" ? all[id] : {};
    const a = q.active && Number.isInteger(q.active.rx) && Number.isInteger(q.active.ry) ? { rx: q.active.rx, ry: q.active.ry, tries: Math.max(0, Math.floor(Number(q.active.tries) || 0)) } : null;
    all[id] = { cycle: Math.max(0, Math.floor(Number(q.cycle) || 0)), cooldown: Math.max(0, Math.floor(Number(q.cooldown) || 0)), active: a, slain: Math.max(0, Math.floor(Number(q.slain) || 0)), escaped: Math.max(0, Math.floor(Number(q.escaped) || 0)) };
  }
  save.worldBeasts = all;
  return save;
}

// Called once per overworld section load. Returns the spawn of the beast holding this section, or null. One beast holds
// a section at a time, and never one the Questing Beast holds.
export function worldBeastFor(save, map, rx, ry) {
  ensureWorldBeasts(save);
  if (!map || map.settlement || map.tiles?.length !== 1024) return null;
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
  const q = save.worldBeasts[here], open = map.tiles.filter((t) => !t.blocked && !t.structure && !t.environment && !LETHAL_KINDS.has(t.kind) && t.x > 7 && t.y > 7 && t.x < 24 && t.y < 24);
  const at = open.sort((a, b) => hashSeed(`wb:${here}:${q.cycle}:${a.x},${a.y}`) - hashSeed(`wb:${here}:${q.cycle}:${b.x},${b.y}`))[0];
  if (!at) return null;
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
export function worldBeastPlayerFell(save, rx, ry, aliveIds) {
  ensureWorldBeasts(save);
  for (const id of WORLD_BEAST_IDS) {
    const B = WORLD_BEASTS[id], q = save.worldBeasts[id];
    if (!aliveIds.includes(id) || !q.active || q.active.rx !== rx || q.active.ry !== ry) continue;
    q.active.tries++;
    if (q.active.tries < B.tries) { const left = B.tries - q.active.tries; return `${B.name} still holds ${rx},${ry}. ${left} ${left === 1 ? "try remains" : "tries remain"}.`; }
    q.escaped++; q.cycle++; q.active = null; q.cooldown = B.cooldownEscaped;
    return B.gone;
  }
  return null;
}
// Sections held by a beast, for the Atlas's danger marks.
export function worldBeastsHeld(save) { return WORLD_BEAST_IDS.map((id) => ({ id, name: WORLD_BEASTS[id].name, ...save.worldBeasts?.[id]?.active })).filter((q) => Number.isInteger(q.rx)); }
