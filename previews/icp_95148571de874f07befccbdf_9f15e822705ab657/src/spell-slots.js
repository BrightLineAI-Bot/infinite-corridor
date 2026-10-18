// Spell slots A and B with Pairings (release 113; Tim, 2026-10-16). Two cast buttons, A and B, each hold one castable:
// a spell or a learned discipline (Aerial Step included). Every castable has its own symbol, and its attribute gives it
// a colour, so a glance at the buttons says what is ready. The two attributes slotted together form a Pairing: a small,
// always-on bonus while both are in place, discovered the first time the pair is slotted. Spells now keep their own
// cooldowns (`magicSkills.cooldowns["spell:<id>"]`), so two spells can share the buttons.
// Data and pure rules; game.ts casts, main.ts draws the buttons and the Arcanum.
import { SPELLS, APERTURE_SKILLS, skillRank } from "./items.js?v=icp_95148571de874f07befccbdf_9f15e822705ab657";

export const ATTRIBUTES = {
  // icon (release 157): the element's mark beside every spell and discipline in the Arcanum.
  fire: { name: "Fire", color: "#e0784a", icon: "🔥" },
  dusk: { name: "Dusk", color: "#a98ad0", icon: "☾" },
  wind: { name: "Wind", color: "#6fbfb8", icon: "≋" },
  ward: { name: "Ward", color: "#7c9fcf", icon: "◈" },
  force: { name: "Force", color: "#cfae5c", icon: "✦" },
  rift: { name: "Rift", color: "#c06fae", icon: "⟡" },
};
export const CASTABLES = {
  "spell:cinder-dart": { kind: "spell", id: "cinder-dart", symbol: "➶", attr: "fire" },
  "spell:ember-ring": { kind: "spell", id: "ember-ring", symbol: "◎", attr: "fire" },
  "spell:grave-sun": { kind: "spell", id: "grave-sun", symbol: "☀", attr: "dusk" },
  "skill:ember-form": { kind: "skill", id: "ember-form", symbol: "✶", attr: "fire" },
  "skill:quickening": { kind: "skill", id: "quickening", symbol: "≫", attr: "wind" },
  "skill:aerial-step": { kind: "skill", id: "aerial-step", symbol: "⇡", attr: "wind" },
  "skill:veil-guard": { kind: "skill", id: "veil-guard", symbol: "◈", attr: "ward" },
  "skill:force-channel": { kind: "skill", id: "force-channel", symbol: "✦", attr: "force" },
  "skill:rift-step": { kind: "skill", id: "rift-step", symbol: "⟡", attr: "rift" },
};
// Pairings by attribute pair (key: the two attribute ids sorted and joined with "+"). Bonuses are data:
// spellDamage and speed are multipliers' increments, cooldown a reduction share, guard damage reduction, stamina per s.
export const PAIRINGS = {
  "fire+fire": { name: "Kindled", text: "Spells deal 15% more damage.", mods: { spellDamage: .15 } },
  "dusk+dusk": { name: "Eclipse", text: "Spells and disciplines recover 10% faster.", mods: { cooldown: .1 } },
  "wind+wind": { name: "Gale", text: "Move 8% faster.", mods: { speed: .08 } },
  "ward+ward": { name: "Bulwark", text: "Take 6% less damage.", mods: { guard: .06 } },
  "force+force": { name: "Surge", text: "Spells deal 10% more damage and recover 5% faster.", mods: { spellDamage: .1, cooldown: .05 } },
  "rift+rift": { name: "Fold", text: "Stamina returns 3 per second faster.", mods: { stamina: 3 } },
  "dusk+fire": { name: "Ashfall", text: "Spells deal 10% more damage; recover 5% faster.", mods: { spellDamage: .1, cooldown: .05 } },
  "fire+wind": { name: "Wildfire", text: "Spells deal 8% more damage; move 5% faster.", mods: { spellDamage: .08, speed: .05 } },
  "fire+ward": { name: "Hearth", text: "Take 4% less damage; spells deal 6% more.", mods: { guard: .04, spellDamage: .06 } },
  "fire+force": { name: "Forge", text: "Spells deal 12% more damage.", mods: { spellDamage: .12 } },
  "fire+rift": { name: "Flare", text: "Spells deal 8% more damage; stamina returns 2 per second faster.", mods: { spellDamage: .08, stamina: 2 } },
  "dusk+wind": { name: "Nightwind", text: "Move 5% faster; recover 6% faster.", mods: { speed: .05, cooldown: .06 } },
  "dusk+ward": { name: "Shroud", text: "Take 5% less damage; recover 5% faster.", mods: { guard: .05, cooldown: .05 } },
  "dusk+force": { name: "Gravity", text: "Spells deal 8% more damage; recover 6% faster.", mods: { spellDamage: .08, cooldown: .06 } },
  "dusk+rift": { name: "Hollow", text: "Recover 8% faster; stamina returns 2 per second faster.", mods: { cooldown: .08, stamina: 2 } },
  "ward+wind": { name: "Tailwind", text: "Move 5% faster; take 4% less damage.", mods: { speed: .05, guard: .04 } },
  "force+wind": { name: "Momentum", text: "Move 6% faster; spells deal 6% more.", mods: { speed: .06, spellDamage: .06 } },
  "rift+wind": { name: "Slipway", text: "Move 6% faster; stamina returns 2 per second faster.", mods: { speed: .06, stamina: 2 } },
  "force+ward": { name: "Aegis", text: "Take 7% less damage.", mods: { guard: .07 } },
  "rift+ward": { name: "Anchorage", text: "Take 4% less damage; stamina returns 2 per second faster.", mods: { guard: .04, stamina: 2 } },
  "force+rift": { name: "Breach", text: "Spells deal 8% more damage; recover 5% faster.", mods: { spellDamage: .08, cooldown: .05 } },
};
export const SLOTS = ["a", "b"];
export const pairKey = (x, y) => [x, y].sort().join("+");

// Castables the Wayfarer can slot now: every spell, every discipline with a rank, Aerial Step once learned.
export function availableCastables(save) {
  return Object.keys(CASTABLES).filter((k) => { const c = CASTABLES[k]; return c.kind === "spell" ? !!SPELLS[c.id] : skillRank(save, c.id) > 0 && !!APERTURE_SKILLS[c.id]; });
}
// Additive at schema 14: seeds A from the equipped spell and B from the discipline bound to the old Spell button.
export function ensureSlots(save) {
  const ms = (save.magicSkills ||= { schema: 1, learned: {}, selected: null, active: null, cooldowns: {}, lastSafe: null });
  ms.cooldowns ||= {};
  const raw = ms.slots && typeof ms.slots === "object" ? ms.slots : null, valid = (k) => (CASTABLES[k] ? k : null);
  ms.slots = raw ? { a: valid(raw.a), b: valid(raw.b) } : { a: `spell:${SPELLS[save.equippedSpell] ? save.equippedSpell : "ember-ring"}`, b: ms.selected && CASTABLES[`skill:${ms.selected}`] ? `skill:${ms.selected}` : null };
  if (ms.slots.a && ms.slots.a === ms.slots.b) ms.slots.b = null;
  ms.pairingsSeen = { ...(ms.pairingsSeen || {}) };
  return ms.slots;
}
export function slotted(save, slot) {
  const k = ensureSlots(save)[slot], c = CASTABLES[k];
  if (!c) return null;
  if (c.kind === "skill" && skillRank(save, c.id) <= 0) return null;
  return { key: k, ...c, name: c.kind === "spell" ? SPELLS[c.id].name : APERTURE_SKILLS[c.id].name, color: ATTRIBUTES[c.attr].color };
}
// Put a castable in a slot (null empties it). Slotting what the other slot holds swaps them.
export function setSlot(save, slot, key) {
  const slots = ensureSlots(save), other = slot === "a" ? "b" : "a";
  if (!SLOTS.includes(slot)) return { ok: false, message: "Unknown slot." };
  if (key && !availableCastables(save).includes(key)) return { ok: false, message: "Not learned yet." };
  if (key && slots[other] === key) slots[other] = slots[slot];
  slots[slot] = key || null;
  syncLegacy(save);
  const p = activePairing(save);
  if (p && !save.magicSkills.pairingsSeen[p.key]) { save.magicSkills.pairingsSeen[p.key] = true; return { ok: true, message: `Pairing found: ${p.name} — ${p.text}`, pairing: p }; }
  const c = slotted(save, slot);
  return { ok: true, message: c ? `${c.name} set in slot ${slot.toUpperCase()}.` : `Slot ${slot.toUpperCase()} emptied.` };
}
// Older systems read `equippedSpell` (spell glyph host) and `selected` (bound discipline); keep them following the slots.
function syncLegacy(save) {
  const ms = save.magicSkills, s = [slotted(save, "a"), slotted(save, "b")].filter(Boolean);
  const spell = s.find((q) => q.kind === "spell"), skill = s.find((q) => q.kind === "skill");
  if (spell) save.equippedSpell = spell.id;
  ms.selected = skill ? skill.id : null;
}
export function activePairing(save) {
  const a = slotted(save, "a"), b = slotted(save, "b");
  if (!a || !b) return null;
  const key = pairKey(a.attr, b.attr), p = PAIRINGS[key];
  return p ? { key, ...p } : null;
}
export function pairingMods(save) {
  const out = { spellDamage: 0, cooldown: 0, speed: 0, guard: 0, stamina: 0 }, p = activePairing(save);
  if (p) for (const [k, v] of Object.entries(p.mods)) out[k] += v;
  return out;
}
// Cooldown state of a slot for the button overlay: {remaining, duration, empty}.
export function slotReadiness(save, slot, legacySpellRemaining = 0) {
  const c = slotted(save, slot);
  if (!c) return { remaining: 0, duration: 0, empty: true };
  const cd = save.magicSkills.cooldowns || {};
  if (c.kind === "spell") return { remaining: Math.max(cd[`spell:${c.id}`] || 0, c.id === save.equippedSpell ? legacySpellRemaining : 0), duration: SPELLS[c.id].cooldown };
  return { remaining: cd[c.id] || 0, duration: APERTURE_SKILLS[c.id].cooldown };
}
