// Spell slots A and B with Pairings (release 113; Tim, 2026-10-16). Two cast buttons, A and B, each hold one castable:
// a spell or a learned discipline (Aerial Step included). Every castable has its own symbol, and its attribute gives it
// a colour, so a glance at the buttons says what is ready. The two attributes slotted together form a Pairing: a small,
// always-on bonus while both are in place, discovered the first time the pair is slotted. Spells now keep their own
// cooldowns (`magicSkills.cooldowns["spell:<id>"]`), so two spells can share the buttons.
// Data and pure rules; game.ts casts, main.ts draws the buttons and the Arcanum.
import { SPELLS, APERTURE_SKILLS, skillRank, spellOpen } from "./items.js?v=r1090-831ad0178128";
import { aerialChargesNow } from "./constellation.js?v=r1090-831ad0178128";

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
  "spell:imbue-weapon": { kind: "spell", id: "imbue-weapon", symbol: "✧", attr: "force" }, // Imbue Weapon (2026-11-04)
  "spell:essence-walk": { kind: "spell", id: "essence-walk", symbol: "∿", attr: "wind" }, // Essence Walk (2026-11-05)
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
// Release 874 (Tim, 2026-11-10: "a new C button replacing the build button... you can still use items in slots A, B, or C";
// then "the player can now equip 3 spells across A, B and C"): a third slot, C, in the Build button's old place. It holds
// what A and B hold (a spell, a discipline, Build or the preset's item); all three may be spells. Like B, C is open at once.
// The Pairing stays the attributes of A and B. Additive at schema 14: a save without C gets an empty C (or what its preset's
// Build button held, below).
// Slot D (Tim, 2026-11-15: "the utility button becomes a fourth assignable slot, D, in every preset, alongside A, B and C"):
// the fixed utility button bottom left is slot D. D, like A, B and C, holds anything a slot holds (a spell, a discipline, Build,
// the preset's item, the Lantern) and the Robot and the Drone, which only the utility button held before. All four slots are
// equal, so A, B and C take the Robot and the Drone too. The Oculus left the presets for its own button under the compass
// (oculus.ts OCULUS.button). The Pairing stays the attributes of A and B.
export const SLOTS = ["a", "b", "c", "d"];
// The input action each slot's button sends. D keeps the utility button's own action ("utility"; "build" is its older name).
export const SLOT_ACTIONS = Object.freeze({ a: "spell", b: "spell2", c: "spell3", d: "utility" });
// Tim, 2026-11-15: "instead of D A B C, switch it over so it's A B C D", then "we can do a b c and d... so they know there's no
// overlap". The player sees and is told letters in the buttons' on-screen reading order (left to right: the utility place, the
// two quick buttons, then the diamond's lower left): save key d shows as A, a as B, b as C, c as D. DISPLAY ONLY: the save keys,
// input actions and the Pairing (keys a and b, shown B and C) are unchanged, so nothing migrates. Keys F, G, C and B press them
// in that order (input.ts).
export const SLOT_ORDER = Object.freeze(["d", "a", "b", "c"]);
export const SLOT_LABELS = Object.freeze({ d: "A", a: "B", b: "C", c: "D" });
export const slotLabel = (q) => SLOT_LABELS[q] || String(q).toUpperCase();
// Release 874: the fixed utility button where the compass sat (bottom left). Each preset chooses what it does. "frame" is the
// Submersible Frame ashore: the robot, its Empowered (power armor) mode and the drone are one control, the same frame
// cycled by the same button (vehicle-gates.ts toggleMech; robot or drone is the frame's mode, chosen in Supplies).
// Release 875 (Tim, 2026-11-11: "you can either have the robot... as a suit or as a drone... they should be... either, or you
// can have one or the other"): the frame's two forms are separate choices, "robot" (the suit, with its power armor) and "drone".
// Only one is ever out: the button calls up its own form and puts the other away first. A stored "frame" (release 874) reads as
// the form the frame was set to (save.mech.mode).
// Since slot D (2026-11-15) this is the migration table for a stored `utility`: `slot` is what D holds in its place. The Oculus
// has its own button now, so a preset that chose it gets an empty D (the Oculus is still one tap away and nothing is lost).
export const UTILITY = Object.freeze({ choices: Object.freeze(["oculus", "build", "robot", "drone"]), default: "build", names: Object.freeze({ oculus: "Oculus", build: "Build", robot: "Robot", drone: "Drone" }), slot: Object.freeze({ oculus: null, build: "build", robot: "robot", drone: "drone" }) });
export const frameForm = (save) => (save?.mech?.mode === "drone" ? "drone" : "robot");
// Release 309 (Tim: "I want you to be able to put build in any one of those positions... items... spells... or build"): A and
// B may also hold "build" or "item" (the preset's item), and the Build button may hold a castable. Additive at schema 14.
// Lantern (2026-11-11): "lantern" joins them, so A, B or C can hold it.
// Slot D (2026-11-15): "robot" and "drone", the Submersible Frame's two forms (Game.pressFrame), go in any slot too.
export const SLOT_TOOLS = ["build", "item", "lantern", "robot", "drone"];
export const FRAME_TOOLS = Object.freeze(["robot", "drone"]);
// The Lantern (Tim, 2026-11-11: "a lantern... the Wayfarer can put on... assignable to one of the A/B/C option buttons...
// Toggling it illuminates the area around the Wayfarer more"). Carried from the start: no source, no cost. Its slot's button
// lights or shutters it (`save.lantern.lit`, additive at schema 14, normalised by ensureLantern from freshSave and migrateSave).
// It never changes the darkness itself: where an area is dark (`places`), the renderer lifts that darkness by lanternLift(d)
// around the Wayfarer, `strength` at the heart out to `inner` of `radius`, easing to nothing at `radius` and beyond. Close
// View's torch reaches `closeReach` times as far. The Gloomvast's Dark and the Stormkraken's ink are a boss's moves, not a
// place's dark, and are left as they are. Outdoors (Tim, 2026-11-15: "the Lantern can still give a little glow around you if
// you're outside on a dark night"): under a night sky (close-view.ts outdoorNight, the section's sky mood) a lit Lantern lays a
// fainter warm glow (`night.glow`) in Standard View and lengthens Close View's carried light `night.reach` times; by day outdoors
// it does nothing.
export const LANTERN = Object.freeze({
  name: "Lantern", symbol: "☼", color: "#f2c46a",
  places: Object.freeze(["dungeon"]), // the areas it lights: every dungeon (caves, the Deep, Pentagons, chasms, labyrinths)
  radius: 4.5, // tiles (Standard View): darkness is lifted within this, never beyond
  inner: .35, // share of the radius lit at full strength
  strength: .8, // share of the darkness lifted at the heart (the dark still reads)
  glow: .14, glowRGB: "255,190,110", // its warm light over the floor (additive, at most this alpha)
  closeReach: 1.4, // Close View: the torch reaches this many times as far while it is lit
  maskPx: 96, // the one cached light mask (pixels a side)
  maskStops: 8, // gradient stops sampled from lanternLift
  night: Object.freeze({ glow: .16, reach: 1.4 }), // outdoors at night: the glow's alpha (Standard View), the carried light's reach (Close View)
});
// How much of the darkness the lit lantern lifts `d` tiles from the Wayfarer: 0..strength, exactly 0 at radius and beyond.
export function lanternLift(d) {
  const L = LANTERN, R = L.radius, r0 = R * L.inner;
  if (!(d >= 0) || d >= R) return d < 0 ? L.strength : 0;
  if (d <= r0) return L.strength;
  const t = (d - r0) / (R - r0); return L.strength * (1 - t * t * (3 - 2 * t));
}
// The darkness left at distance d where an overlay would lay `dark` (0..1): lifted only within the radius, only while lit.
export const litDarkness = (dark, d, lit = true) => (lit ? dark * (1 - lanternLift(d)) : dark);
// The mask's gradient stops, [offset, alpha] from the centre (0) to the radius (1), sampled once.
export const LANTERN_STOPS = Object.freeze(Array.from({ length: LANTERN.maskStops + 1 }, (_, i) => Object.freeze([i / LANTERN.maskStops, lanternLift(LANTERN.radius * i / LANTERN.maskStops) / LANTERN.strength])));
export const lanternLit = (save) => save?.lantern?.lit === true;
// Whether the lantern is lighting `area` now (lit, and the area is one of its dark places).
export const lanternShines = (save, area) => lanternLit(save) && LANTERN.places.includes(area);
// Close View: the torch's reach times this (1 unless the lantern shines here).
export const lanternReach = (save, area) => (lanternShines(save, area) ? LANTERN.closeReach : 1);
// Outdoors: the carried light's reach times this (1 unless the lantern is lit and it is night).
export const lanternNightReach = (save, night) => (night && lanternLit(save) ? LANTERN.night.reach : 1);
export function ensureLantern(save) {
  if (!save || typeof save !== "object") return null;
  const raw = save.lantern && typeof save.lantern === "object" && !Array.isArray(save.lantern) ? save.lantern : {};
  save.lantern = { ...raw, lit: raw.lit === true }; // unknown fields kept
  return save.lantern;
}
export function toggleLantern(save) {
  const l = ensureLantern(save); l.lit = !l.lit;
  return { ok: true, lit: l.lit, message: l.lit ? "The lantern is lit: the dark draws back around you." : "You shutter the lantern." };
}
// The name of a slot tool, for messages and labels.
export const slotToolName = (t) => (t?.tool === "build" ? "Build" : t?.tool === "lantern" ? LANTERN.name : FRAME_TOOLS.includes(t?.tool) ? UTILITY.names[t.tool] : "Item");
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
  // Release 261 spell presets (Tim: "two different presets for the spells... I'll just toggle it"): two saved slot sets;
  // the slots always hold the active one. Additive at schema 14: a save without presets starts with both as its slots.
  // Release 291: each preset also said what the Build button did: "build", or "item" with the item it uses (additive).
  // Release 874: the Build button became slot C (`c`) and the fixed utility button (`utility`). A preset from before 874
  // keeps what its Build button held: a spell, a discipline or an item moves to C; the Submersible Frame (the robot) moves
  // to the utility button (release 875: as "robot" or "drone"); plain Build stays Build, on the utility button, with C empty. `button` is kept as it
  // was, no longer read, so nothing written before is lost.
  const pair = (q) => {
    if (!q || typeof q !== "object") return null;
    const legacy = q.button === "item" ? "item" : CASTABLES[q.button] ? q.button : "build", item = BUTTON_ITEMS.includes(q.item) ? q.item : null, frame = legacy === "item" && item === "submersible";
    const c = Object.hasOwn(q, "c") ? valid(q.c) : legacy === "build" || frame ? null : legacy;
    const utility = UTILITY.choices.includes(q.utility) ? q.utility : q.utility === "frame" || (!Object.hasOwn(q, "utility") && frame) ? frameForm(save) : UTILITY.default; // release 875: "frame" became its form
    // Slot D (2026-11-15): a preset without `d` takes it from its utility choice (UTILITY.slot: Build, Robot and Drone stay on
    // the button, the Oculus leaves D empty). `utility` is kept as it was, no longer read, like `button`; a `d` already there wins.
    // D already held by A, B or C (Build twice, say) is left empty: a slot holds a thing once.
    let d = Object.hasOwn(q, "d") ? valid(q.d) : UTILITY.slot[utility] ?? null;
    if (d && [valid(q.a), valid(q.b), c].includes(d)) d = null;
    const out = { ...q, a: valid(q.a), b: valid(q.b), c, d, utility, item }; // release 874: other fields (an older `button`, unknown ones) are kept
    if (!(q.build && typeof q.build === "object")) delete out.build; // release 393: `build` (build-presets.ts) rides along
    return out;
  };
  const list = Array.isArray(ms.presets) ? ms.presets.slice(0, PRESETS).map(pair) : [];
  ms.preset = ms.preset === 1 ? 1 : 0;
  // Slot D: the loadout in hand takes D from its preset (migrated from that preset's utility above); a save with no presets
  // gets the old default utility, Build.
  const dNow = list[ms.preset] ? list[ms.preset].d : UTILITY.slot[UTILITY.default];
  ms.slots = raw ? { a: valid(raw.a), b: valid(raw.b), c: Object.hasOwn(raw, "c") ? valid(raw.c) : list[ms.preset]?.c ?? null, d: Object.hasOwn(raw, "d") ? valid(raw.d) : dNow } : { a: `spell:${SPELLS[save.equippedSpell] ? save.equippedSpell : "ember-ring"}`, b: ms.selected && CASTABLES[`skill:${ms.selected}`] ? `skill:${ms.selected}` : null, c: null, d: dNow };
  if (ms.slots.a && ms.slots.a === ms.slots.b) ms.slots.b = null;
  if (ms.slots.c && (ms.slots.c === ms.slots.a || ms.slots.c === ms.slots.b)) ms.slots.c = null;
  if (ms.slots.d && (ms.slots.d === ms.slots.a || ms.slots.d === ms.slots.b || ms.slots.d === ms.slots.c)) ms.slots.d = null;
  ms.pairingsSeen = { ...(ms.pairingsSeen || {}) };
  // Release 489/493: a retired spell's glyph sockets give their glyphs back (Iron Fist became a weapon, Hammerfall and Great Sweep tools).
  for (const id of RETIRED_SPELLS) { const g = save.spellGlyphs?.[id]; if (!Array.isArray(g)) continue; save.glyphs ||= {}; for (const q of g) if (q) save.glyphs[q] = (Number(save.glyphs[q]) || 0) + 1; delete save.spellGlyphs[id]; if (save.equippedSpell === id) save.equippedSpell = "ember-ring"; }
  ms.presets = Array.from({ length: PRESETS }, (_, i) => list[i] || { ...ms.slots, item: null }); // slot D: a new preset's D is the loadout's (no `utility`: D replaced it)
  ms.presets[ms.preset] = { ...ms.presets[ms.preset], ...ms.slots };
  return ms.slots;
}
export const PRESETS = 2;
// Release 291 (Tim, 2026-10-22: "you should also be able to select whether... the build button is a build or an item... on
// your preset... next to each item in the supplies menu... preset 1 or preset 2... if preset 1 is set to build, then only
// preset 2 will be selectable"). The items the Build button can use.
// 2026-11-12: the Stego Bait (stego-bait.ts) goes on a preset like the tonics.
export const BUTTON_ITEMS = ["ironbarkTonic", "lumenPhial", "clearrootAmpoule", "submersible", "stegoBait"]; // release 311: the submersible frame (Tim: "this one should get its own option to place in the... preset slot") // release 293 (Tim): not the draught, which has its own Potion button; release 295: nor the Hull Shield, which Build already deploys at sea (hold)
// Release 874: what was the Build button is slot C. These keep the release-291/309 reading of it: "item", a castable key,
// or "build" for anything else (C empty or holding Build).
const legacyButton = (c) => (c === "item" ? "item" : CASTABLES[c] ? c : "build");
export function presetButton(save, i = save?.magicSkills?.preset || 0) { ensureSlots(save); const p = save.magicSkills.presets[i]; return { button: legacyButton(p.c), item: p.item || null }; }
// Sets preset i's slot C the release-291 way: "item", a learned castable, or anything else for an empty C.
export function setPresetButton(save, i, mode) {
  ensureSlots(save); const ms = save.magicSkills, p = ms.presets[i]; if (!p) return null;
  if (CASTABLES[mode] && !availableCastables(save).includes(mode)) return legacyButton(p.c);
  const key = mode === "item" ? "item" : CASTABLES[mode] ? mode : null;
  if (i === (ms.preset || 0)) setSlot(save, "c", key); else { p.c = key; if (key && (p.a === key || p.b === key || p.d === key)) p.c = null; }
  return legacyButton(ms.presets[i].c);
}
// Gives `type` to preset i's item (used by every slot set to Item); again, takes it off.
export function assignPresetItem(save, i, type) {
  ensureSlots(save); const p = save.magicSkills.presets[i];
  if (!p || !BUTTON_ITEMS.includes(type)) return { ok: false, message: "That item cannot go on a button." };
  const where = SLOT_ORDER.filter((q) => p[q] === "item").map(slotLabel); // release 309: any slot set to Item uses it
  if (!where.length) return { ok: false, message: `Preset ${i + 1} has no Item slot. Set slot A, B, C or D to Item in the Arcanum first.` };
  p.item = p.item === type ? null : type; return { ok: true, message: p.item ? `Preset ${i + 1}: its item is now this one (on ${where.join(", ")}).` : `Preset ${i + 1}: no item.` };
}
// What slot C does now, the release-291 way: { mode: "build" }, { mode: "item", item } or { mode: "cast", key }.
export function activeButton(save) { const b = presetButton(save); return b.button === "item" ? { mode: "item", item: b.item } : CASTABLES[b.button] ? { mode: "cast", key: b.button } : { mode: "build" }; }
// Slot `slot` of preset i, and setting it (the active preset's goes through setSlot, so the HUD follows at once). Setting what
// another slot of that preset holds swaps the two, as setSlot does.
export function presetSlot(save, i, slot) { ensureSlots(save); return save.magicSkills.presets[i]?.[slot] ?? null; }
export function setPresetSlot(save, i, slot, key) {
  ensureSlots(save); const ms = save.magicSkills, p = ms.presets[i];
  if (!p || !SLOTS.includes(slot)) return { ok: false, message: "Unknown slot." };
  if (key && !SLOT_TOOLS.includes(key) && !availableCastables(save).includes(key)) return { ok: false, message: "Not learned yet." };
  if (i === (ms.preset || 0)) return setSlot(save, slot, key);
  const other = key ? SLOTS.find((q) => q !== slot && p[q] === key) : null; if (other) p[other] = p[slot] ?? null;
  p[slot] = key || null; return { ok: true, message: `Preset ${i + 1}: slot ${slotLabel(slot)} ${key ? "set" : "emptied"}.` };
}
// Release 874's utility button is slot D (2026-11-15). These keep their callers working: what D of preset i holds (a slot key or
// null), and setting it, by a slot key or a stored utility choice (UTILITY.slot: "oculus" empties D).
export function presetUtility(save, i = save?.magicSkills?.preset || 0) { return presetSlot(save, i, "d"); }
export function setPresetUtility(save, i, choice) {
  const key = Object.hasOwn(UTILITY.slot, choice) ? UTILITY.slot[choice] : choice;
  if (key && !SLOT_TOOLS.includes(key) && !CASTABLES[key]) return { ok: false, message: `That cannot go in slot ${slotLabel("d")}.` };
  return setPresetSlot(save, i, "d", key);
}
export const activeUtility = (save) => presetUtility(save);
// What slot A or B holds when it is not a castable: "build", "item" (with the preset's item), or null.
export function slotTool(save, slot) { const k = ensureSlots(save)[slot]; return SLOT_TOOLS.includes(k) ? { tool: k, item: k === "item" ? save.magicSkills.presets[save.magicSkills.preset || 0]?.item || null : null } : null; }
// Switch to the other preset: its spells go into A and B (passives are untouched). Returns the message to show.
export function togglePreset(save) {
  const slots = ensureSlots(save), ms = save.magicSkills, next = (ms.preset + 1) % PRESETS, p = ms.presets[next], have = availableCastables(save);
  ms.presets[ms.preset] = { ...ms.presets[ms.preset], ...slots }; ms.preset = next;
  const ok = (k) => k && (SLOT_TOOLS.includes(k) || have.includes(k)); slots.a = ok(p.a) ? p.a : null; slots.b = ok(p.b) && p.b !== slots.a ? p.b : null;
  slots.c = ok(p.c) && p.c !== slots.a && p.c !== slots.b ? p.c : null; // release 874
  slots.d = ok(p.d) && p.d !== slots.a && p.d !== slots.b && p.d !== slots.c ? p.d : null; // slot D (2026-11-15): one tap swaps all four
  ms.presets[next] = { ...p, ...slots }; syncLegacy(save);
  const name = (q) => { const c = slotted(save, q), t = !c && slotTool(save, q); return c ? c.name : t ? slotToolName(t) : "empty"; };
  return { ok: true, preset: next + 1, message: `Spell preset ${next + 1}: ${SLOT_ORDER.map((q) => `${slotLabel(q)} ${name(q)}`).join(" · ")}.` };
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
  const slots = ensureSlots(save);
  if (!SLOTS.includes(slot)) return { ok: false, message: "Unknown slot." };
  if (key && !SLOT_TOOLS.includes(key) && !availableCastables(save).includes(key)) return { ok: false, message: "Not learned yet." };
  const other = key ? SLOTS.find((q) => q !== slot && slots[q] === key) : null; // release 874: any of the other two slots
  if (other) slots[other] = slots[slot];
  slots[slot] = key || null;
  save.magicSkills.presets[save.magicSkills.preset] = { ...save.magicSkills.presets[save.magicSkills.preset], ...slots }; // release 261: setting a slot sets the active preset
  syncLegacy(save);
  const p = activePairing(save);
  if (p && !save.magicSkills.pairingsSeen[p.key]) { save.magicSkills.pairingsSeen[p.key] = true; return { ok: true, message: `Pairing found: ${p.name} — ${p.text}`, pairing: p }; }
  const c = slotted(save, slot), t = slotTool(save, slot);
  const n = slotLabel(slot); // 2026-11-15: the player is told the slot's on-screen letter (SLOT_LABELS)
  return { ok: true, message: c ? `${c.name} set in slot ${n}.` : t ? `${t.tool === "item" ? "The preset's item" : slotToolName(t)} set in slot ${n}.` : `Slot ${n} emptied.` };
}
// Older systems read `equippedSpell` (spell glyph host) and `selected` (bound discipline); keep them following the slots.
function syncLegacy(save) {
  const ms = save.magicSkills, s = SLOTS.map((q) => slotted(save, q)).filter(Boolean);
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
  if (c.id === "aerial-step") { const charges = aerialChargesNow(save); return { remaining: charges > 0 ? 0 : cd[c.id] || 0, duration: APERTURE_SKILLS[c.id].cooldown, charges }; } // its charges (2026-11-15): ready while one is held
  return { remaining: cd[c.id] || 0, duration: APERTURE_SKILLS[c.id].cooldown };
}
