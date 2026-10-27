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
import { socketGlyph, GLYPHS } from "./glyphs.js?v=r495-27a316be8aa7";
import { ALT_PASSIVES } from "./constellation.js?v=r495-27a316be8aa7";
import { ensureLattice } from "./transit-lattice.js?v=r495-27a316be8aa7";
import { togglePreset } from "./spell-slots.js?v=r495-27a316be8aa7";

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
// Switches preset with its whole build. Returns togglePreset's result with the message extended.
export function swapPreset(save) {
  const ms = save.magicSkills || {}, from = ms.preset || 0, leaving = snapshotBuild(save), r = togglePreset(save), to = save.magicSkills.preset;
  save.magicSkills.presets[from].build = leaving;
  const coming = normalizeBuild(save.magicSkills.presets[to].build);
  if (!coming) { save.magicSkills.presets[to].build = leaving; return r; }
  const missing = applyBuild(save, coming), gone = applyGear(save, coming.gear);
  return { ...r, message: `${r.message} Glyphs, passive forms and the Lattice follow.${coming.gear ? " So do its weapon and tool." : ""}${missing.length ? ` Not in your pouch: ${missing.join(", ")}.` : ""}${gone.length ? ` Not in your pack: the preset's ${gone.join(" and ")}.` : ""}` };
}
