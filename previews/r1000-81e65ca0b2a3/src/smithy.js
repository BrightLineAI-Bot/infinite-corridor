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
import { hashSeed, rng } from "./random.js?v=r1000-81e65ca0b2a3";
import { AFFIX_POOLS, rollAffixValue, itemTier, ITEM_TIERS, normalizeItemUpgrade } from "./items.js?v=r1000-81e65ca0b2a3";
import { normalizeSockets, socketCount, GLYPHS } from "./glyphs.js?v=r1000-81e65ca0b2a3";

export const SMITHY = {
  unlock: { salvage: 1, reforge: 1, socket: 2, masterwork: 3 },
  salvage: { iron: { common: 1, rare: 2, epic: 3, relic: 4 }, sphereChance: .15 }, // 2026-11-11 (Tim: tools fire rounds made from cinder iron, so "salvaging weapons should yield cinder iron again"): back to 1/2/3/4 (release 607 made it 1/1/2/2)
  reforge: { iron: 3, marks: 40 },
  socket: { iron: 4, lumenDust: 6 },
  masterwork: { iron: 12, marks: 120 },
};
// Salvage yield (Tim, 2026-11-18: lumen dust could not be earned from salvage). The Wayfarer chooses, at Sela's forge or the
// town smith, what salvage pays: cinder iron (the default, as before) or lumen dust. The choice applies to every salvage, by
// hand, by the smith and a full pack's automatic one. In lumen dust a piece pays `lumenPerIron` of the cinder iron it would
// have paid (SMITHY.salvage.iron by tier: a relic .8, a common .2), the fraction carried in save.salvageYield.carry until a
// whole dust gathers, so nothing is lost to rounding. At .2 (the smelting rate: SMELT.cost 5 iron to a sphere) a relic
// salvage is worth under one dust, against 1-3 from a tall-tower cache, a dig or a canyon find and 2 for severing a relay:
// steady but not dominant, and it costs all of that salvage's iron (the tool rounds' supply). Glyph dust, glyphs and the
// smith's sphere chance are paid either way. save.salvageYield = { mode, carry } is additive at schema 14 (ensureSalvageYield,
// called by freshSave and migrateSave); unknown fields on it are kept.
export const SALVAGE_YIELD = Object.freeze({ modes: Object.freeze(["cinderIron", "lumenDust"]), fallback: "cinderIron", lumenPerIron: .2, labels: Object.freeze({ cinderIron: "Cinder iron", lumenDust: "Lumen dust" }) });
const HUNDREDTHS = 100;
export function ensureSalvageYield(save) {
  const raw = save.salvageYield && typeof save.salvageYield === "object" && !Array.isArray(save.salvageYield) ? save.salvageYield : {};
  const mode = SALVAGE_YIELD.modes.includes(raw.mode) ? raw.mode : SALVAGE_YIELD.fallback, c = Number(raw.carry);
  if (raw === save.salvageYield && raw.mode === mode && (raw.carry === 0 || (Number.isFinite(c) && c > 0 && c < 1 && Math.round(c * HUNDREDTHS) / HUNDREDTHS === c))) return raw; // already sound: no new object
  save.salvageYield = { ...raw, mode, carry: Number.isFinite(c) && c > 0 && c < 1 ? Math.round(c * HUNDREDTHS) / HUNDREDTHS : 0 };
  return save.salvageYield;
}
export const salvageYieldMode = (save) => ensureSalvageYield(save).mode;
export function setSalvageYield(save, mode) {
  if (!SALVAGE_YIELD.modes.includes(mode)) return { ok: false, message: "Salvage cannot yield that." };
  ensureSalvageYield(save).mode = mode;
  return { ok: true, message: mode === "lumenDust" ? `Salvage now yields lumen dust: ${Math.round(SALVAGE_YIELD.lumenPerIron * 5 * 100) / 100} for every 5 cinder iron it would have paid, gathered as it adds up. Tool rounds still need cinder iron.` : "Salvage now yields cinder iron." };
}
// The lumen dust `iron` worth of salvage would pay now, and the carry it would leave (pure: nothing is changed).
function lumenFor(save, iron) {
  const units = Math.round(ensureSalvageYield(save).carry * HUNDREDTHS) + Math.round(Math.max(0, Number(iron) || 0) * SALVAGE_YIELD.lumenPerIron * HUNDREDTHS);
  return { whole: Math.floor(units / HUNDREDTHS), carry: (units % HUNDREDTHS) / HUNDREDTHS };
}
// Pays one salvage worth `iron` cinder iron in the chosen yield. Returns { iron, lumenDust } actually paid.
export function paySalvage(save, iron) {
  save.materials ||= {};
  const n = Math.max(0, Number(iron) || 0);
  if (salvageYieldMode(save) !== "lumenDust") { save.materials.cinderIron = (Number(save.materials.cinderIron) || 0) + n; return { iron: n, lumenDust: 0 }; }
  const { whole, carry } = lumenFor(save, n);
  save.salvageYield.carry = carry; save.materials.lumenDust = (Number(save.materials.lumenDust) || 0) + whole;
  return { iron: 0, lumenDust: whole };
}
// What salvaging pieces worth `iron` cinder iron (in total) would pay, as words for a button: "4 iron" or "0.8 lumen dust".
export function salvageYieldText(save, iron) {
  const n = Math.max(0, Number(iron) || 0);
  if (salvageYieldMode(save) !== "lumenDust") return `${n} iron`;
  return `${Math.round(n * SALVAGE_YIELD.lumenPerIron * HUNDREDTHS) / HUNDREDTHS} lumen dust`;
}
// A paid salvage as words: "4 cinder iron", "1 lumen dust" or "no whole lumen dust yet (0.4 gathered)".
export function salvagePaidText(save, paid) {
  if (paid?.lumenDust > 0) return `${paid.lumenDust} lumen dust`;
  if (salvageYieldMode(save) === "lumenDust") return `no whole lumen dust yet (${ensureSalvageYield(save).carry} gathered)`;
  return `${paid?.iron || 0} cinder iron`;
}
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
  returnGlyphs(save, item); save.inventory.splice(index, 1); const paid = paySalvage(save, iron); // 2026-11-18: in the chosen yield (SALVAGE_YIELD)
  if (sphere) save.materials[sphere] = (Number(save.materials[sphere]) || 0) + 1;
  return { ok: true, iron: paid.iron, lumenDust: paid.lumenDust, sphere, message: `The smith breaks down ${item.name}: ${salvagePaidText(save, paid)}${sphere ? ` and ${sphere === "armorSphere" ? "an armor" : "a weapon"} sphere` : ""}.` };
}
export function reforgeAffix(save, slot, index) {
  if (!smithOpen(save, "reforge")) return { ok: false, message: lockedWhy("reforge") };
  const item = save.equipment?.[slot], list = Array.isArray(item?.affixes) ? item.affixes : [];
  if (!item || !list[index]) return { ok: false, message: "That has no such affix to reforge." };
  const cost = asMaterials(SMITHY.reforge); if (!has(save, cost)) return { ok: false, message: `Reforging takes ${costText(SMITHY.reforge)}.` };
  const before = list[index], after = reforgeRoll(save, item, index); // the roll the smith showed (reforgePreview)
  pay(save, cost); item.reforged = (Number(item.reforged) || 0) + 1;
  list[index] = after;
  return { ok: true, before, after, message: `The smith reforges ${item.name}: ${before.id} ${before.value} becomes ${after.id} ${after.value}.` };
}
// The affix the next reforge of `index` gives: seeded by the save, the piece's id and its next reforge count (item.reforged + 1),
// with the kind drawn from the slot's pool less the kinds the piece's other affixes hold. Pure: reading it changes nothing.
// 2026-11-18 (Tim: "show the exact result before I tap"): the smith shows this roll on the button. Seeing it costs nothing and
// cannot move it: only a paid reforge of the piece advances the count (to the next seeded roll), so reopening the menu, an
// upgrade, a masterwork, a socket, a reload or anything else shows the same roll again.
export function reforgeRoll(save, item, index) {
  const list = Array.isArray(item?.affixes) ? item.affixes : [];
  if (!item || !list[index]) return null;
  const r = rng(`${save.seed}:reforge:${item.id}:${(Number(item.reforged) || 0) + 1}`), pool = AFFIX_POOLS[item.slot] || ["attack"], others = list.filter((_, i) => i !== index).map((a) => a.id);
  const choices = pool.filter((id) => !others.includes(id)), id = choices.length ? choices[Math.floor(r() * choices.length) % choices.length] : list[index].id;
  return { id, value: rollAffixValue(r, id, Math.max(1, ITEM_TIERS.indexOf(itemTier(item)))) };
}
// The next reforge of the slot's affix `index`: { before, after, direction } (direction "up" | "down" | "same" | "other", a
// different kind of affix), or null. Pure.
export function reforgePreview(save, slot, index) {
  const item = save?.equipment?.[slot], before = Array.isArray(item?.affixes) ? item.affixes[index] : null, after = before ? reforgeRoll(save, item, index) : null;
  if (!after) return null;
  const a = Number(after.value) || 0, b = Number(before.value) || 0;
  return { before, after, direction: after.id !== before.id ? "other" : a > b ? "up" : a < b ? "down" : "same" };
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
