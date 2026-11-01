// The town smith (release 395; Tim, 2026-10-24, taking the recommendation: "the smithy can do all those things that you just
// described"). A smith works in every Listener town (beside the Mouth, game.ts raiseMouthTown). Each service opens as more
// Listeners fall (`unlock`, by save.farArray.listeners), and all of them take cinder iron:
// - Salvage: break an item in the pack down into cinder iron by its tier, with a chance (`sphereChance`) of a sphere of its
//   kind. Its glyphs go back to the pouch first.
// - Reforge: roll one affix of an equipped item again: a fresh kind from its slot's pool and a fresh value for its tier,
//   with the same numbers as loot (items.ts rollAffixValue). Rolls are seeded by the item and how often it was reforged.
// - Socket: one extra glyph socket on a weapon, tool or armor (item.extraSockets, once per item).
// - Masterwork: one rank past the tier's upgrade cap (item.masterwork, once per item; items.ts itemCap).
// The item fields are additive and kept by normalizeItemUpgrade. Pure rules: no DOM.
import { hashSeed, rng } from "./random.js?v=r678-6d6efd972939";
import { AFFIX_POOLS, rollAffixValue, itemTier, ITEM_TIERS, normalizeItemUpgrade } from "./items.js?v=r678-6d6efd972939";
import { normalizeSockets, socketCount, GLYPHS } from "./glyphs.js?v=r678-6d6efd972939";

export const SMITHY = {
  unlock: { salvage: 1, reforge: 1, socket: 2, masterwork: 3 },
  salvage: { iron: { common: 1, rare: 1, epic: 2, relic: 2 }, sphereChance: .15 }, // release 607 (Tim: the economy is "almost without consequence"): was 1/2/3/4
  reforge: { iron: 3, marks: 40 },
  socket: { iron: 4, lumenDust: 6 },
  masterwork: { iron: 12, marks: 120 },
};
const listeners = (save) => Math.max(0, Math.floor(Number(save?.farArray?.listeners) || 0));
export const smithOpen = (save, service) => listeners(save) >= SMITHY.unlock[service];
const lockedWhy = (service) => `The smith takes on ${service} work once ${SMITHY.unlock[service]} Listener${SMITHY.unlock[service] === 1 ? " has" : "s have"} fallen.`;
const has = (save, cost) => Object.entries(cost).every(([k, n]) => (k === "marks" ? Number(save.currency) || 0 : Number(save.materials?.[k]) || 0) >= n);
const pay = (save, cost) => { for (const [k, n] of Object.entries(cost)) { if (k === "marks") save.currency -= n; else save.materials[k] -= n; } };
const costText = (cost) => Object.entries(cost).map(([k, n]) => `${n} ${k === "marks" ? "marks" : k === "iron" ? "cinder iron" : k === "lumenDust" ? "lumen dust" : k}`).join(" and ");
const asMaterials = (cost) => Object.fromEntries(Object.entries(cost).map(([k, n]) => [k === "iron" ? "cinderIron" : k, n]));
const returnGlyphs = (save, item) => { for (const q of item?.glyphs || []) if (q && GLYPHS[q]) save.glyphs[q] = (save.glyphs[q] || 0) + 1; };

export function salvageItem(save, index) {
  if (!smithOpen(save, "salvage")) return { ok: false, message: lockedWhy("salvage") };
  const item = save.inventory?.[index]; if (!item) return { ok: false, message: "Nothing there to salvage." };
  const tier = itemTier(item), iron = SMITHY.salvage.iron[tier] || 1, sphere = (hashSeed(`${save.seed}:salvage:${item.id}`) % 1000) / 1000 < SMITHY.salvage.sphereChance ? (item.slot === "armor" || item.slot === "charm" ? "armorSphere" : "weaponSphere") : null;
  returnGlyphs(save, item); save.inventory.splice(index, 1); save.materials.cinderIron = (Number(save.materials.cinderIron) || 0) + iron;
  if (sphere) save.materials[sphere] = (Number(save.materials[sphere]) || 0) + 1;
  return { ok: true, iron, sphere, message: `The smith breaks down ${item.name}: ${iron} cinder iron${sphere ? ` and ${sphere === "armorSphere" ? "an armor" : "a weapon"} sphere` : ""}.` };
}
export function reforgeAffix(save, slot, index) {
  if (!smithOpen(save, "reforge")) return { ok: false, message: lockedWhy("reforge") };
  const item = save.equipment?.[slot], list = Array.isArray(item?.affixes) ? item.affixes : [];
  if (!item || !list[index]) return { ok: false, message: "That has no such affix to reforge." };
  const cost = asMaterials(SMITHY.reforge); if (!has(save, cost)) return { ok: false, message: `Reforging takes ${costText(SMITHY.reforge)}.` };
  pay(save, cost); item.reforged = (Number(item.reforged) || 0) + 1;
  const r = rng(`${save.seed}:reforge:${item.id}:${item.reforged}`), pool = AFFIX_POOLS[item.slot] || ["attack"], others = list.filter((_, i) => i !== index).map((a) => a.id);
  const choices = pool.filter((id) => !others.includes(id)), id = choices.length ? choices[Math.floor(r() * choices.length) % choices.length] : list[index].id, before = list[index];
  list[index] = { id, value: rollAffixValue(r, id, Math.max(1, ITEM_TIERS.indexOf(itemTier(item)))) };
  return { ok: true, before, after: list[index], message: `The smith reforges ${item.name}: ${before.id} ${before.value} becomes ${id} ${list[index].value}.` };
}
export function addSocket(save, slot) {
  if (!smithOpen(save, "socket")) return { ok: false, message: lockedWhy("socket") };
  const item = save.equipment?.[slot]; if (!item || !socketCount(item)) return { ok: false, message: "Only a weapon, a tool or armor takes glyph sockets." };
  if (item.extraSockets === 1) return { ok: false, message: `${item.name} already has the smith's extra socket.` };
  const cost = asMaterials(SMITHY.socket); if (!has(save, cost)) return { ok: false, message: `A new socket takes ${costText(SMITHY.socket)}.` };
  pay(save, cost); item.extraSockets = 1; normalizeSockets(item);
  return { ok: true, message: `The smith cuts a new socket into ${item.name}: ${socketCount(item)} now.` };
}
export function masterwork(save, slot) {
  if (!smithOpen(save, "masterwork")) return { ok: false, message: lockedWhy("masterwork") };
  const item = save.equipment?.[slot]; if (!item) return { ok: false, message: "Nothing equipped there." };
  if (item.masterwork === true) return { ok: false, message: `${item.name} is already a masterwork.` };
  const cost = asMaterials(SMITHY.masterwork); if (!has(save, cost)) return { ok: false, message: `A masterwork takes ${costText(SMITHY.masterwork)}.` };
  pay(save, cost); item.masterwork = true; save.equipment[slot] = normalizeItemUpgrade(item);
  return { ok: true, message: `${item.name} is a masterwork now: it can be strengthened one rank further.` };
}
