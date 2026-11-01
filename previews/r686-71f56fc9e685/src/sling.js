// The sling (release 543; Tim, 2026-10-28: "a pack that can have... ten items... a sling or something like that... they don't
// count to what your inventory space, and they just don't move... you don't have to see them when [you] select... items that
// you want to save... a couple different weapons or tools that you've masterworked... but you're not using them right now").
//
// save.sling (additive at schema 14) holds up to `size` pieces of gear out of the pack: they do not count against its space,
// they are not shown among the pack's pieces (so Select all and salvage never reach them), and nothing sells or salvages
// them. Move a piece in from the pack, back out when the pack has room, or equip it straight from the sling (what it
// replaces takes its place in the sling, so the pack is not touched).
import { normalizeItemUpgrade } from "./items.js?v=r686-71f56fc9e685";

export const SLING = { size: 10 };
const GEAR = ["primary", "secondary", "armor", "charm"];
const isGear = (q) => q && typeof q === "object" && GEAR.includes(q.slot);

// Never drops a piece: a sling over `size` (it cannot get there in play) keeps them all and takes no more.
export function ensureSling(save) {
  save.sling = (Array.isArray(save.sling) ? save.sling : []).filter(isGear).map((q) => normalizeItemUpgrade(q));
  return save.sling;
}
export function toSling(save, index) {
  const sling = ensureSling(save), item = save.inventory?.[index];
  if (!isGear(item)) return { ok: false, message: "Only gear goes in the sling." };
  if (sling.length >= SLING.size) return { ok: false, message: `The sling holds ${SLING.size}. Take one out first.` };
  sling.push(save.inventory.splice(index, 1)[0]);
  return { ok: true, message: `${item.name} is in the sling (${sling.length}/${SLING.size}): out of the pack, safe from selling and salvage.` };
}
export function fromSling(save, index, capacity) {
  const sling = ensureSling(save), item = sling[index];
  if (!item) return { ok: false, message: "That is not in the sling." };
  if ((save.inventory || []).length >= capacity) return { ok: false, message: "The pack is full." };
  save.inventory.push(sling.splice(index, 1)[0]);
  return { ok: true, message: `${item.name} is back in the pack.` };
}
export function equipFromSling(save, index) {
  const sling = ensureSling(save), item = sling[index];
  if (!item) return { ok: false, message: "That is not in the sling." };
  const prior = save.equipment[item.slot] || null;
  save.equipment[item.slot] = item;
  if (prior) sling[index] = prior; else sling.splice(index, 1);
  return { ok: true, message: `${item.name} equipped from the sling${prior ? `; ${prior.name} takes its place there` : ""}.` };
}
