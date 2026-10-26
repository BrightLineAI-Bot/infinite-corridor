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
import { socketGlyph, GLYPHS } from "./glyphs.js?v=r457-a6a870c3b2a7";
import { ALT_PASSIVES } from "./constellation.js?v=r457-a6a870c3b2a7";
import { ensureLattice } from "./transit-lattice.js?v=r457-a6a870c3b2a7";
import { togglePreset } from "./spell-slots.js?v=r457-a6a870c3b2a7";

const ids = (list) => (Array.isArray(list) ? list.filter((q) => typeof q === "string" && q) : []);
export function normalizeBuild(b) {
  if (!b || typeof b !== "object") return null;
  const glyphs = Object.fromEntries(Object.entries(b.glyphs && typeof b.glyphs === "object" ? b.glyphs : {}).filter(([, v]) => Array.isArray(v)).map(([h, v]) => [h, v.map((q) => (GLYPHS[q] ? q : null))]));
  const alt = Object.fromEntries(Object.keys(b.alt && typeof b.alt === "object" ? b.alt : {}).filter((k) => ALT_PASSIVES[k] && b.alt[k] === true).map((k) => [k, true]));
  return { glyphs, alt, lattice: { passives: ids(b.lattice?.passives), echoes: ids(b.lattice?.echoes) } };
}
// The build as it stands.
export function snapshotBuild(save) {
  return normalizeBuild({ glyphs: save.spellGlyphs || {}, alt: save.constellation?.alt || {}, lattice: save.lattice || {} });
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
  const missing = applyBuild(save, coming);
  return { ...r, message: `${r.message} Glyphs, passive forms and the Lattice follow.${missing.length ? ` Not in your pouch: ${missing.join(", ")}.` : ""}` };
}
