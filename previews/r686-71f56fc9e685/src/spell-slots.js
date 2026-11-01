// Spell slots A and B with Pairings (release 113; Tim, 2026-10-16). Two cast buttons, A and B, each hold one castable:
// a spell or a learned discipline (Aerial Step included). Every castable has its own symbol, and its attribute gives it
// a colour, so a glance at the buttons says what is ready. The two attributes slotted together form a Pairing: a small,
// always-on bonus while both are in place, discovered the first time the pair is slotted. Spells now keep their own
// cooldowns (`magicSkills.cooldowns["spell:<id>"]`), so two spells can share the buttons.
// Data and pure rules; game.ts casts, main.ts draws the buttons and the Arcanum.
import { SPELLS, APERTURE_SKILLS, skillRank, spellOpen } from "./items.js?v=r686-71f56fc9e685";

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
  "spell:shadow-clone": { kind: "spell", id: "shadow-clone", symbol: "◐", attr: "dusk" }, // release 365: from Infinite III
  "spell:gravity-well": { kind: "spell", id: "gravity-well", symbol: "⊛", attr: "rift" },
  "spell:stillpoint": { kind: "spell", id: "stillpoint", symbol: "⧗", attr: "ward" },
  "spell:aegis": { kind: "spell", id: "aegis", symbol: "⛉", attr: "ward" }, // release 485
  "spell:shadow-boxing": { kind: "spell", id: "shadow-boxing", symbol: "⚔", attr: "dusk" },
  "spell:orbit-volley": { kind: "spell", id: "orbit-volley", symbol: "❂", attr: "rift" }, // release 487
  "spell:fire-burst": { kind: "spell", id: "fire-burst", symbol: "✺", attr: "fire" }, // release 547
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
// Release 309 (Tim: "I want you to be able to put build in any one of those positions... items... spells... or build"): A and
// B may also hold "build" or "item" (the preset's item), and the Build button may hold a castable. Additive at schema 14.
export const SLOT_TOOLS = ["build", "item"];
export const pairKey = (x, y) => [x, y].sort().join("+");

// Castables the Wayfarer can slot now: every spell, every discipline with a rank, Aerial Step once learned.
export function availableCastables(save) {
  return Object.keys(CASTABLES).filter((k) => { const c = CASTABLES[k]; return c.kind === "spell" ? spellOpen(save, c.id) : skillRank(save, c.id) > 0 && !!APERTURE_SKILLS[c.id]; });
}
// Additive at schema 14: seeds A from the equipped spell and B from the discipline bound to the old Spell button.
export const RETIRED_SPELLS = ["iron-fist", "hammerfall", "great-sweep"]; // release 489; 493: Hammerfall and Great Sweep became tools
export function ensureSlots(save) {
  const ms = (save.magicSkills ||= { schema: 1, learned: {}, selected: null, active: null, cooldowns: {}, lastSafe: null });
  ms.cooldowns ||= {};
  const raw = ms.slots && typeof ms.slots === "object" ? ms.slots : null, valid = (k) => (CASTABLES[k] || SLOT_TOOLS.includes(k) ? k : null);
  ms.slots = raw ? { a: valid(raw.a), b: valid(raw.b) } : { a: `spell:${SPELLS[save.equippedSpell] ? save.equippedSpell : "ember-ring"}`, b: ms.selected && CASTABLES[`skill:${ms.selected}`] ? `skill:${ms.selected}` : null };
  if (ms.slots.a && ms.slots.a === ms.slots.b) ms.slots.b = null;
  ms.pairingsSeen = { ...(ms.pairingsSeen || {}) };
  // Release 489/493: a retired spell's glyph sockets give their glyphs back (Iron Fist became a weapon, Hammerfall and Great Sweep tools).
  for (const id of RETIRED_SPELLS) { const g = save.spellGlyphs?.[id]; if (!Array.isArray(g)) continue; save.glyphs ||= {}; for (const q of g) if (q) save.glyphs[q] = (Number(save.glyphs[q]) || 0) + 1; delete save.spellGlyphs[id]; if (save.equippedSpell === id) save.equippedSpell = "ember-ring"; }
  // Release 261 spell presets (Tim: "two different presets for the spells... I'll just toggle it"): two saved A/B pairs;
  // the slots always hold the active one. Additive at schema 14: a save without presets starts with both as its slots.
  // Release 291: each preset also says what the Build button does: "build", or "item" with the item it uses (additive).
  const pair = (q) => (q && typeof q === "object" ? { a: valid(q.a), b: valid(q.b), button: q.button === "item" ? "item" : CASTABLES[q.button] ? q.button : "build", item: BUTTON_ITEMS.includes(q.item) ? q.item : null, ...(q.build && typeof q.build === "object" ? { build: q.build } : {}) } : null); // release 393: `build` (build-presets.ts) rides along
  const list = Array.isArray(ms.presets) ? ms.presets.slice(0, PRESETS).map(pair) : [];
  ms.preset = ms.preset === 1 ? 1 : 0;
  ms.presets = Array.from({ length: PRESETS }, (_, i) => list[i] || { ...ms.slots, button: "build", item: null });
  ms.presets[ms.preset] = { ...ms.presets[ms.preset], ...ms.slots };
  return ms.slots;
}
export const PRESETS = 2;
// Release 291 (Tim, 2026-10-22: "you should also be able to select whether... the build button is a build or an item... on
// your preset... next to each item in the supplies menu... preset 1 or preset 2... if preset 1 is set to build, then only
// preset 2 will be selectable"). The items the Build button can use.
export const BUTTON_ITEMS = ["ironbarkTonic", "lumenPhial", "clearrootAmpoule", "submersible"]; // release 311: the submersible frame (Tim: "this one should get its own option to place in the... preset slot") // release 293 (Tim): not the draught, which has its own Potion button; release 295: nor the Hull Shield, which Build already deploys at sea (hold)
export function presetButton(save, i = save?.magicSkills?.preset || 0) { ensureSlots(save); const p = save.magicSkills.presets[i]; return { button: p.button === "item" ? "item" : CASTABLES[p.button] ? p.button : "build", item: p.item || null }; }
export function setPresetButton(save, i, mode) { ensureSlots(save); const p = save.magicSkills.presets[i]; if (!p) return null; if (CASTABLES[mode] && !availableCastables(save).includes(mode)) return p.button; p.button = mode === "item" ? "item" : CASTABLES[mode] ? mode : "build"; return p.button; }
// Gives `type` to preset i's Build button (only while that preset's button is set to Item); again, takes it off.
export function assignPresetItem(save, i, type) {
  ensureSlots(save); const p = save.magicSkills.presets[i];
  if (!p || !BUTTON_ITEMS.includes(type)) return { ok: false, message: "That item cannot go on a button." };
  if (p.button !== "item" && p.a !== "item" && p.b !== "item") return { ok: false, message: `Preset ${i + 1} has no Item slot. Set A, B or the Build button to Item in the Arcanum first.` };
  const where = [p.button === "item" && "the Build button", p.a === "item" && "A", p.b === "item" && "B"].filter(Boolean); // release 309: any slot set to Item uses it
  p.item = p.item === type ? null : type; return { ok: true, message: p.item ? `Preset ${i + 1}: its item is now this one${where.length ? ` (on ${where.join(", ")})` : "; set a slot to Item in the Arcanum to use it"}.` : `Preset ${i + 1}: no item.` };
}
// What the Build button does now: { mode: "build" } or { mode: "item", item } (item may be null: nothing assigned).
export function activeButton(save) { const b = presetButton(save); return b.button === "item" ? { mode: "item", item: b.item } : CASTABLES[b.button] ? { mode: "cast", key: b.button } : { mode: "build" }; }
// What slot A or B holds when it is not a castable: "build", "item" (with the preset's item), or null.
export function slotTool(save, slot) { const k = ensureSlots(save)[slot]; return SLOT_TOOLS.includes(k) ? { tool: k, item: k === "item" ? save.magicSkills.presets[save.magicSkills.preset || 0]?.item || null : null } : null; }
// Switch to the other preset: its spells go into A and B (passives are untouched). Returns the message to show.
export function togglePreset(save) {
  const slots = ensureSlots(save), ms = save.magicSkills, next = (ms.preset + 1) % PRESETS, p = ms.presets[next], have = availableCastables(save);
  ms.presets[ms.preset] = { ...ms.presets[ms.preset], ...slots }; ms.preset = next;
  const ok = (k) => k && (SLOT_TOOLS.includes(k) || have.includes(k)); slots.a = ok(p.a) ? p.a : null; slots.b = ok(p.b) && p.b !== slots.a ? p.b : null;
  ms.presets[next] = { ...p, ...slots }; syncLegacy(save);
  const a = slotted(save, "a"), b = slotted(save, "b");
  return { ok: true, preset: next + 1, message: `Spell preset ${next + 1}: A ${a ? a.name : "empty"} · B ${b ? b.name : "empty"}.` };
}
export function slotted(save, slot) {
  const k = ensureSlots(save)[slot], c = CASTABLES[k];
  if (!c) return null;
  if (c.kind === "skill" && skillRank(save, c.id) <= 0) return null;
  if (c.kind === "spell" && !spellOpen(save, c.id)) return null; // release 365
  return { key: k, ...c, name: c.kind === "spell" ? SPELLS[c.id].name : APERTURE_SKILLS[c.id].name, color: ATTRIBUTES[c.attr].color };
}
// Put a castable in a slot (null empties it). Slotting what the other slot holds swaps them.
export function setSlot(save, slot, key) {
  const slots = ensureSlots(save), other = slot === "a" ? "b" : "a";
  if (!SLOTS.includes(slot)) return { ok: false, message: "Unknown slot." };
  if (key && !SLOT_TOOLS.includes(key) && !availableCastables(save).includes(key)) return { ok: false, message: "Not learned yet." };
  if (key && slots[other] === key) slots[other] = slots[slot];
  slots[slot] = key || null;
  save.magicSkills.presets[save.magicSkills.preset] = { ...save.magicSkills.presets[save.magicSkills.preset], ...slots }; // release 261: setting a slot sets the active preset
  syncLegacy(save);
  const p = activePairing(save);
  if (p && !save.magicSkills.pairingsSeen[p.key]) { save.magicSkills.pairingsSeen[p.key] = true; return { ok: true, message: `Pairing found: ${p.name} — ${p.text}`, pairing: p }; }
  const c = slotted(save, slot), t = slotTool(save, slot);
  return { ok: true, message: c ? `${c.name} set in slot ${slot.toUpperCase()}.` : t ? `${t.tool === "build" ? "Build" : "The preset's item"} set in slot ${slot.toUpperCase()}.` : `Slot ${slot.toUpperCase()} emptied.` };
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
// Release 313 (Tim: "a timer on the skills to show how long they last... the button can... get illuminated... that color
// can just drain out... until the buff is over"): how much of a running skill's effect is left, 0..1 (0 when not running).
// Timed skills use magicSkills.active (duration kept since 313; older saves fall back to the skill's base duration);
// Rift Step shows its after-step infusion (magicSkills.riftInfuse).
export const RIFT_INFUSE_SECONDS = 4; // glyphs.ts SKILL_INFUSE_AFTER_STEP
export function buffLeft(save, key) {
  const c = CASTABLES[key], ms = save?.magicSkills; if (!c || c.kind !== "skill" || !ms) return 0;
  if (c.id === "rift-step") return ms.riftInfuse > 0 ? Math.min(1, ms.riftInfuse / RIFT_INFUSE_SECONDS) : 0;
  const a = ms.active; if (!a || a.id !== c.id || !(a.remaining > 0)) return 0;
  const total = Number(a.duration) > 0 ? a.duration : (APERTURE_SKILLS[c.id]?.duration || a.remaining);
  return Math.max(0, Math.min(1, a.remaining / total));
}
// Cooldown state of a slot for the button overlay: {remaining, duration, empty}.
export function slotReadiness(save, slot, legacySpellRemaining = 0) {
  const c = slotted(save, slot);
  if (!c) return { remaining: 0, duration: 0, empty: !slotTool(save, slot) };
  const cd = save.magicSkills.cooldowns || {};
  if (c.kind === "spell") return { remaining: Math.max(cd[`spell:${c.id}`] || 0, c.id === save.equippedSpell ? legacySpellRemaining : 0), duration: SPELLS[c.id].cooldown };
  return { remaining: cd[c.id] || 0, duration: APERTURE_SKILLS[c.id].cooldown };
}
