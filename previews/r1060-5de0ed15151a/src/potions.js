// Potion tiers (release 339; Tim, 2026-10-23: "there's a potion, a high potion, and a Max potion... high potion... twice the
// amount... the Max potion will heal... your health to full. A high potion cost 3 potions, and the Max potion cost 5 potions";
// "you can just set the Max potion as your potion"). The Restorative Draught is the plain Potion. High and Max Potions are
// crafted from draughts in Pack → Supplies; the Potion button drinks the chosen tier (save.potionChoice, additive), falling
// back to a plain draught when the chosen tier runs out. Counts live in save.consumables like every other supply.
export const POTIONS = {
  restorativeDraught: { name: "Restorative Draught", short: "Potion", heal: 30, cost: 0 },
  highPotion: { name: "High Potion", short: "High Potion", heal: 60, cost: 3 },
  maxPotion: { name: "Max Potion", short: "Max Potion", heal: Infinity, cost: 5 },
};
export const POTION_IDS = Object.keys(POTIONS);
export const potionChoice = (save) => (POTIONS[save?.potionChoice] ? save.potionChoice : "restorativeDraught");
export function setPotionChoice(save, id) {
  if (!POTIONS[id]) return { ok: false, message: "Unknown potion." };
  save.potionChoice = id;
  return { ok: true, message: `The Potion button now drinks ${POTIONS[id].name}s.` };
}
// Release 341 (Tim: "Select the toggle, and then it'll just craft potions for you... when you... hit the button, potions will
// be available to you. Potions of whichever rank you want"): the chosen tier is brewed from draughts the moment the button
// needs one. How many of the chosen tier the button can give: those carried, plus what the draughts would brew.
export function potionsReady(save) {
  const c = save?.consumables || {}, chosen = potionChoice(save), P = POTIONS[chosen], draughts = c.restorativeDraught || 0;
  return P.cost ? (c[chosen] || 0) + Math.floor(draughts / P.cost) : draughts;
}
// What the Potion button drinks now: the chosen tier while one is carried or can be brewed, else a plain draught.
export function potionToDrink(save) {
  const c = save?.consumables || {}, chosen = potionChoice(save);
  return (c[chosen] || 0) > 0 || (POTIONS[chosen].cost && (c.restorativeDraught || 0) >= POTIONS[chosen].cost) ? chosen : "restorativeDraught";
}
// Brews one High or Max Potion from Restorative Draughts.
export function craftPotion(save, id) {
  const P = POTIONS[id], c = (save.consumables ||= {});
  if (!P || !P.cost) return { ok: false, message: "That cannot be brewed." };
  if ((c.restorativeDraught || 0) < P.cost) return { ok: false, message: `${P.name} needs ${P.cost} Restorative Draughts (you have ${c.restorativeDraught || 0}).` };
  c.restorativeDraught -= P.cost; c[id] = (c[id] || 0) + 1; notePotion(save, id);
  return { ok: true, message: `Brewed a ${P.name} from ${P.cost} draughts.` };
}
// Fixes from a 20-hour playthrough (I15): the compendium counted a potion found only while one was carried, so a High or Max
// Potion the Potion button brews and drinks at once (release 341) stayed unfound. A potion brewed or drunk is known for good
// (worldFlags `potion-known:<id>`, at most one flag a tier), and the chosen tier the button can brew now counts too.
export const POTION_KNOWN = "potion-known:";
export function notePotion(save, id) { if (POTIONS[id] && save && typeof save === "object") (save.worldFlags ||= {})[POTION_KNOWN + id] = true; }
export function potionKnown(save, id) {
  const P = POTIONS[id], c = save?.consumables || {}; if (!P) return false;
  return (Number(c[id]) || 0) > 0 || save?.worldFlags?.[POTION_KNOWN + id] === true || (!!P.cost && potionChoice(save) === id && (Number(c.restorativeDraught) || 0) >= P.cost);
}
// Health a potion restores for a Wayfarer with `maxHp`.
export const potionHeal = (id, maxHp) => (POTIONS[id]?.heal === Infinity ? maxHp : POTIONS[id]?.heal || 0);
