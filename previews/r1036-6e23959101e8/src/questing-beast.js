// The Questing Beast (release 116; energy attacks and harder tuning in release 187): a unique hunter (MONSTER_PACK.questingBeast) tuned to the
// Wayfarer's level and power. Now and then it claims a wild section. It stays there until it is killed or it has
// killed the Wayfarer QUESTING_BEAST.tries times; then it is gone, and after a cooldown (counted in sections entered)
// a new hunt can begin somewhere else. 2026-11-18 (Tim: "give the Questing Beast the 15-minute engagement window too, replacing its
// four tries"): its tries are gone; it holds its section for the world beasts' engagement window (world-beasts.ts BEAST_ENGAGEMENT,
// `engagedAt` on its hunt, the same rules), then it is gone as it always went, fading where it stands.
import { hashSeed, byHash } from "./random.js?v=r1036-6e23959101e8";
import { WORLD_BEASTS, BEAST_BASELINE, BEAST_BALANCE, beastProfileVitals, ENCOUNTER, encounterReady, encounterChance, encounterMet, isMarineTile, beastUnlocked, BEAST_ENGAGEMENT, beastEngaged } from "./world-beasts.js?v=r1036-6e23959101e8";
import { LETHAL_KINDS } from "./landscape.js?v=r1036-6e23959101e8";

// Release 187 (Tim, 2026-10-18): far tougher and far more dangerous. About twice the health; each blow takes about
// 27% of maximum health (four unhealed hits kill); it runs fast and barely pauses between attacks.
export const QUESTING_BEAST = { chance: 0.035, minDepth: 4, cooldownSlain: 24, cooldownEscaped: 30, hitsToKill: 55, hpPerLevel: 25, damageShare: 0.27, speed: 1.55, attackGap: .12, staggerResistance: .85, rewardMarks: 150, rewardPerLevel: 15 };

export function ensureQuestingBeast(s) {
  const q = s.questingBeast && typeof s.questingBeast === "object" ? s.questingBeast : {};
  const a = q.active && typeof q.active === "object" && Number.isInteger(q.active.rx) && Number.isInteger(q.active.ry) ? { ...q.active, rx: q.active.rx, ry: q.active.ry, tries: Math.max(0, Number(q.active.tries) || 0), ...(Number(q.active.hpShare) > 0 && Number(q.active.hpShare) <= 1 ? { hpShare: Number(q.active.hpShare) } : {}) } : null; // hpShare: release 423, its kept wounds
  if (q.active && !(Number(q.active.hpShare) > 0 && Number(q.active.hpShare) <= 1) && a) delete a.hpShare;
  if (a && q.active.engagedAt != null && Number.isFinite(Number(q.active.engagedAt))) a.engagedAt = Number(q.active.engagedAt); else if (a) delete a.engagedAt; // 2026-11-18: its engagement window's start
  s.questingBeast = { ...q, v: 1, cycle: Math.max(0, Number(q.cycle) || 0), cooldown: Math.max(0, Number(q.cooldown) || 0), active: a, slain: Math.max(0, Number(q.slain) || 0), escaped: Math.max(0, Number(q.escaped) || 0), ...(q.spoils === true ? { spoils: true } : {}) }; // spoils: release 263
  if (s.questingBeast.spoils !== true) delete s.questingBeast.spoils;
  return s;
}

// The Questing Beast and the sea (release 261): never claims a section at least `none` ocean, and in one over `watery` ocean
// its chance is scaled by `wateryChance`.
export const QB_SEA = { none: .9, watery: .3, wateryChance: .25 };
// Called once per overworld section load. Returns a spawn for the beast in this section, or null.
export function questingBeastFor(save, map, rx, ry) {
  ensureQuestingBeast(save); const q = save.questingBeast;
  if (!map || map.settlement || map.tiles?.length !== 1024 || Math.abs(rx) + Math.abs(ry) < QUESTING_BEAST.minDepth) return null;
  if (map.farDomain && !(q.active && q.active.rx === rx && q.active.ry === ry)) return null; // release 723: in its domain it comes by waiting (Game.domainTick), not by the roll
  if (!q.active) {
    if (q.cooldown > 0) { q.cooldown--; return null; }
    if (!beastUnlocked(save, "questingBeast") || !encounterReady(save)) return null; // release 261: the buffer between meetings (273: and Aperture tier 8)
    // Release 261 (Tim: "the questing beast can't be on totally ocean tiles... much, much more rare" on water).
    const sea = map.tiles.filter(isMarineTile).length / map.tiles.length; if (sea >= QB_SEA.none) return null;
    if ((hashSeed(`${save.seed}:questing-beast:v1:${q.cycle}:${rx}:${ry}`) % 1000) / 1000 >= QUESTING_BEAST.chance * encounterChance(save) * (sea > QB_SEA.watery ? QB_SEA.wateryChance : 1)) return null;
    q.active = { rx, ry, tries: 0 }; encounterMet(save);
  }
  if (q.active.rx !== rx || q.active.ry !== ry) return null;
  const open = map.tiles.filter((t) => !t.blocked && !t.structure && !t.environment && !LETHAL_KINDS.has(t.kind) && t.x > 7 && t.y > 7 && t.x < 24 && t.y < 24);
  const at = open.sort(byHash((a) => `qb:${q.cycle}:${a.x},${a.y}`))[0];
  if (!at) return null;
  return { id: `questing-beast:${q.cycle}`, kind: "questingBeast", x: at.x, y: at.y, boss: true, questingBeast: true, traits: [] };
}
// The engagement window (2026-11-18): seconds left (Infinity before it is engaged), and what its messages say of it.
export function questingBeastWindowLeft(save) {
  const q = save?.questingBeast?.active; if (!q || !Number.isFinite(q.engagedAt)) return Infinity;
  return BEAST_ENGAGEMENT.seconds - ((Number(save.playSeconds) || 0) - q.engagedAt);
}
export function questingBeastHoldNote(save) {
  const L = questingBeastWindowLeft(save), m = Math.max(1, Math.ceil((Number.isFinite(L) ? Math.max(0, L) : BEAST_ENGAGEMENT.seconds) / 60));
  return Number.isFinite(L) ? `It will hold this ground about ${m} more minute${m === 1 ? "" : "s"}.` : `Once you engage it, it will hold this ground for ${m} minutes.`;
}
// Each frame while its actor lives in the loaded section: engages the hunt the first time it is roused (`aggro`), and is true when
// the window has run out (roused or not, once engaged).
export function questingBeastWindow(save, e) {
  ensureQuestingBeast(save); const q = save.questingBeast.active; if (!q) return false;
  if (!beastEngaged(q)) { if (!e?.aggro) return false; q.engagedAt = Number(save.playSeconds) || 0; }
  return questingBeastWindowLeft(save) <= 0;
}
// Its window is over: the hunt ends as an escape (as four deaths used to end it). Returns its parting line.
export const QB_GONE = { line: "The Questing Beast has had its fill of this place and is gone. In time it will hunt somewhere else." };
export function questingBeastLeaves(save) {
  ensureQuestingBeast(save); const q = save.questingBeast; if (!q.active) return null;
  q.escaped++; q.cycle++; q.active = null; q.cooldown = QUESTING_BEAST.cooldownEscaped;
  return QB_GONE.line;
}
// On every area load: an engaged hunt whose window ran out while the Wayfarer was elsewhere has gone unseen. Its own section, loaded,
// finds it there instead, to leave in sight. True when it went.
export function questingBeastLost(save, area, rx, ry) {
  ensureQuestingBeast(save); const q = save.questingBeast.active;
  if (!q || !beastEngaged(q) || questingBeastWindowLeft(save) > 0 || (area === "overworld" && q.rx === rx && q.ry === ry)) return false;
  questingBeastLeaves(save); return true;
}

// Tunes a created combatant to the Wayfarer: health is about `hitsToKill` of the Wayfarer's current melee blows
// (weapon power + might) plus a little per level; its blows land as a share of the Wayfarer's max health, offset by armour.
export function tuneQuestingBeast(c, save, stats = {}) {
  const own = beastProfileVitals(QUESTING_BEAST, save, stats), others = Object.values(WORLD_BEASTS).map(profile => beastProfileVitals(profile, save, stats));
  const hp = Math.max(Math.round((Number(c.maxHp) || 0) * BEAST_BALANCE.hp), own.hp, Math.ceil(Math.max(...others.map(v => v.hp)) * BEAST_BASELINE.questingDominance));
  const damage = Math.max(Math.round((Number(c.damage) || 0) * BEAST_BALANCE.damage), own.damage, Math.ceil(Math.max(...others.map(v => v.damage)) * BEAST_BASELINE.questingDominance));
  Object.assign(c, { questingBeast: true, boss: true, hp, maxHp: hp, damage, beastTuningVersion: 1, staggerResistance: QUESTING_BEAST.staggerResistance, speedMultiplier: QUESTING_BEAST.speed, attackGap: QUESTING_BEAST.attackGap, evasive: true });
  return c;
}

// The beast falls: pay the bounty and start the cooldown. Returns the message.
export function questingBeastSlain(save) {
  ensureQuestingBeast(save); const q = save.questingBeast, marks = QUESTING_BEAST.rewardMarks + QUESTING_BEAST.rewardPerLevel * (Number(save.level) || 1);
  save.currency = (Number(save.currency) || 0) + marks;
  q.slain++; q.cycle++; q.active = null; q.cooldown = QUESTING_BEAST.cooldownSlain;
  return { marks, message: `The Questing Beast falls. Its spines crumble to ash and pale bone. +${marks} marks.` };
}
// The Wayfarer fell in the beast's section while it lived. Returns a message, or null if the beast was not involved. Since 2026-11-18
// a death ends nothing: it is counted on the hunt (`tries`, kept for older code and saves) and the window runs on.
export function questingBeastPlayerFell(save, rx, ry, beastAlive) {
  ensureQuestingBeast(save); const q = save.questingBeast;
  if (!beastAlive || !q.active || q.active.rx !== rx || q.active.ry !== ry) return null;
  q.active.tries++;
  return `The Questing Beast still holds ${rx},${ry}. ${questingBeastHoldNote(save)}`;
}
