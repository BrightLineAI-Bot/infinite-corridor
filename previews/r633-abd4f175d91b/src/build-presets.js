// Whole-build presets (release 393; Tim, 2026-10-24: "all the spells that are equippable and the Transit Lattice... need
// presets in the Arcanum... for glyphs, and all the skills need presets"; he took the recommendation that each preset also
// remembers the glyphs set in every spell and skill, which form each passive takes, and the Transit Lattice's picks).
//
// Preset 1 and preset 2 already hold A, B and the Build button (spell-slots.ts). Each now also keeps `build`:
//   { glyphs: { host: [glyphId|null, ...] }, alt: { nodeId: true }, lattice: { passives: [...], echoes: [...] } }
// Switching stores the build you leave in the preset you leave, then sets the other preset's build: every spell and skill
// glyph goes back to the pouch first, then the preset's glyphs are set from the pouch where you still have them (a glyph
// now in your gear or spent shows as an empty socket, named in the message). A preset with no build yet takes the build you
// have, so the first switch changes nothing but the spells. Gear glyphs (weapon, tool, armor) are not part of a preset.
// Release 493 (Tim: "the presets should be able to preset... your weapon and your tool... preset one and preset two"): a
// build also keeps `gear: { primary, secondary }`, the tags of the weapon and tool it was left with. Switching to it equips
// them from the pack when they are there (a piece that was salvaged or sold is named in the message instead). Gear gets a
// tag (`item.tag`, additive) the first time a preset records it; the tag rides with the item wherever it goes.
import { socketGlyph, GLYPHS } from "./glyphs.js?v=r633-abd4f175d91b";
import { ALT_PASSIVES } from "./constellation.js?v=r633-abd4f175d91b";
import { ensureLattice } from "./transit-lattice.js?v=r633-abd4f175d91b";
import { togglePreset } from "./spell-slots.js?v=r633-abd4f175d91b";
import { normalizeItemUpgrade } from "./items.js?v=r633-abd4f175d91b";

const ids = (list) => (Array.isArray(list) ? list.filter((q) => typeof q === "string" && q) : []);
export function normalizeBuild(b) {
  if (!b || typeof b !== "object") return null;
  const glyphs = Object.fromEntries(Object.entries(b.glyphs && typeof b.glyphs === "object" ? b.glyphs : {}).filter(([, v]) => Array.isArray(v)).map(([h, v]) => [h, v.map((q) => (GLYPHS[q] ? q : null))]));
  const alt = Object.fromEntries(Object.keys(b.alt && typeof b.alt === "object" ? b.alt : {}).filter((k) => ALT_PASSIVES[k] && b.alt[k] === true).map((k) => [k, true]));
  const tag = (q) => (typeof q === "string" && q ? q : null), gear = b.gear && typeof b.gear === "object" ? { primary: tag(b.gear.primary), secondary: tag(b.gear.secondary) } : null;
  return { glyphs, alt, lattice: { passives: ids(b.lattice?.passives), echoes: ids(b.lattice?.echoes) }, ...(gear ? { gear } : {}) };
}
export const GEAR_SLOTS = ["primary", "secondary"];
// The tag of an equipped piece, giving it one if it has none.
export function gearTag(save, slot) {
  const item = save.equipment?.[slot]; if (!item) return null;
  if (typeof item.tag !== "string" || !item.tag) { save.gearTagCounter = (Number(save.gearTagCounter) || 0) + 1; item.tag = `gear-${save.gearTagCounter}`; }
  return item.tag;
}
// Equips the tagged pieces from the pack. Returns the slots it could not fill.
export function applyGear(save, gear) {
  const missing = [];
  for (const slot of GEAR_SLOTS) {
    const want = gear?.[slot]; if (!want || save.equipment?.[slot]?.tag === want) continue;
    const i = (save.inventory || []).findIndex((q) => q?.tag === want && q.slot === slot);
    if (i < 0) { missing.push(slot === "primary" ? "weapon" : "tool"); continue; }
    const prior = save.equipment[slot] || null; save.equipment[slot] = { ...save.inventory[i] }; save.inventory.splice(i, 1); if (prior) save.inventory.push(prior);
  }
  return missing;
}
// The build as it stands.
export function snapshotBuild(save) {
  return normalizeBuild({ glyphs: save.spellGlyphs || {}, alt: save.constellation?.alt || {}, lattice: save.lattice || {}, gear: { primary: gearTag(save, "primary"), secondary: gearTag(save, "secondary") } });
}
// Sets a build. Returns the names of glyphs it could not set.
export function applyBuild(save, build) {
  const b = normalizeBuild(build); if (!b) return [];
  for (const [host, list] of Object.entries(save.spellGlyphs || {})) list.forEach((q, i) => { if (q) socketGlyph(save, host, i, null); });
  const missing = [];
  for (const [host, list] of Object.entries(b.glyphs)) list.forEach((q, i) => { if (q && !socketGlyph(save, host, i, q).ok) missing.push(GLYPHS[q].name); });
  if (save.constellation) save.constellation.alt = { ...b.alt };
  if (save.lattice) { save.lattice.passives = [...b.lattice.passives]; save.lattice.echoes = [...b.lattice.echoes]; ensureLattice(save); }
  return missing;
}
// Release 541 (Tim: "when you set an item or a tool... in your preset, it does not become... unequipped... It's like your
// character just has a second weapon slot... a second tool slot... you don't have the ability to sell or lose or salvage the
// other items that are in your other preset"): each preset has its own weapon, tool and armor. `save.presetGear[i]` holds
// preset i's pieces while preset i is not the one in use, out of the pack, so nothing there can be sold, salvaged or lost.
// A held slot that is null means preset i shares what is equipped. On a switch, a slot the other preset holds is swapped in
// (what you had goes into the held slot of the preset you leave); a slot it does not hold stays as it is. Once presets are
// in use (a switch has happened), equipping a new piece over a shared one puts the old piece in the other preset's held slot
// rather than the pack, so it stays that preset's (stashForOtherPreset). Additive at schema 14.
// Release 553 (Tim: "armor shouldn't swap with the preset and should just be tools... spells, skills and weapons; armor stays
// the same, like the... Quiet Compass"): weapon and tool only. Armor a preset was holding (release 541) goes back to the pack,
// never lost.
export const PRESET_GEAR_SLOTS = ["primary", "secondary"];
export function ensurePresetGear(save) {
  const held = Array.isArray(save.presetGear) ? save.presetGear : [];
  for (const set of held) { const q = set?.armor; if (q && typeof q === "object" && q.slot === "armor") (save.inventory ||= []).push(normalizeItemUpgrade(q)); }
  save.presetGear = [0, 1].map((i) => Object.fromEntries(PRESET_GEAR_SLOTS.map((slot) => { const q = held[i]?.[slot]; return [slot, q && typeof q === "object" && q.slot === slot ? normalizeItemUpgrade(q) : null]; })));
  return save;
}
const presetsInUse = (save) => (save.magicSkills?.presets || []).some((p) => p?.build);
// Equipping over `prior` in `slot`: keep it for the other preset when that preset shares the slot. True when kept.
export function stashForOtherPreset(save, slot, prior) {
  if (!prior || !PRESET_GEAR_SLOTS.includes(slot) || !presetsInUse(save)) return false;
  ensurePresetGear(save); const other = 1 - (save.magicSkills.preset || 0);
  if (save.presetGear[other][slot]) return false;
  save.presetGear[other][slot] = prior; return true;
}
// Swaps in the held gear of preset `to`; what was equipped goes to preset `from`'s held slot. Returns the slots swapped.
function swapPresetGear(save, from, to) {
  ensurePresetGear(save); const swapped = [];
  for (const slot of PRESET_GEAR_SLOTS) { const coming = save.presetGear[to][slot]; if (!coming) continue; save.presetGear[from][slot] = save.equipment[slot] || null; save.equipment[slot] = coming; save.presetGear[to][slot] = null; swapped.push(slot === "primary" ? "weapon" : "tool"); }
  return swapped;
}
// Switches preset with its whole build. Returns togglePreset's result with the message extended.
export function swapPreset(save) {
  const ms = save.magicSkills || {}, from = ms.preset || 0, leaving = snapshotBuild(save), r = togglePreset(save), to = save.magicSkills.preset;
  save.magicSkills.presets[from].build = leaving;
  const coming = normalizeBuild(save.magicSkills.presets[to].build), swapped = swapPresetGear(save, from, to); // release 541
  const gearNote = swapped.length ? ` Preset ${to + 1}'s ${swapped.join(", ")} in hand; preset ${from + 1}'s are kept for it.` : "";
  if (!coming) { save.magicSkills.presets[to].build = leaving; return { ...r, message: r.message + gearNote }; }
  // Release 527 (Tim: "...I just salvaged an amazing Lumen Spindle, because it became unequipped"): a switch never puts gear
  // in the pack. Release 541: each preset's own pieces wait in its held slots (above) instead. Gear tags and applyGear stay
  // for saves and tests; applyGear is not called here.
  const missing = applyBuild(save, coming);
  return { ...r, message: `${r.message} Glyphs, passive forms and the Lattice follow.${gearNote || " Your gear stays equipped."}${missing.length ? ` Not in your pouch: ${missing.join(", ")}.` : ""}` };
}
