// Refuge meals (release 447; Tim, 2026-10-26: "food buffs... 15 minutes of like fast stamina... you should have to go back
// to the town to get another... similar to Monster Hunter... combinations of ingredients to make a food that gives you a
// desired buff... extra damage, life, stamina, movement speed, attack speed... magic recovery... It shouldn't be crazy...
// something that attracts... world bosses... make it easier for world bosses to find you").
//
// A cook (Hollis Dray at Ember Refuge, and the cook in every Listener town) makes a meal from two ingredients of the
// pantry, eaten on the spot: food is never carried. Two different ingredients give both their effects; the same one twice
// gives a hearty helping, one effect at `MEAL.hearty` times. One meal at a time: a new one replaces the last. A meal lasts
// `MEAL.seconds` of play (paused time does not count) and survives a fall. State: save.meal = { a, b, remaining }
// (additive; normalised by ensureMeal). Balance lives in INGREDIENTS; pure rules, no DOM.

export const MEAL = { seconds: 15 * 60, hearty: 1.5 };
// Each ingredient: its price in marks, the course it names, and what it does (fractions of the matching stat).
//   damage — melee and spell damage; life — maximum health; stamina — stamina recovery; speed — movement;
//   haste — attack speed (shorter recovery between blows); focus — spell recovery (shorter cooldowns);
//   lure — world beasts find you: fewer new sections between meetings (`gap`, a share of the usual) and a higher
//   section chance (`chance`, extra on top of 1).
export const INGREDIENTS = {
  emberPepper: { name: "Ember pepper", course: "stew", price: 10, text: "harder blows and spells", bonus: { attackDamage: .08, spellDamage: .08 } },
  ironroot: { name: "Ironroot", course: "pie", price: 10, text: "more health", bonus: { hp: .12 } },
  honeycomb: { name: "Honeycomb", course: "porridge", price: 10, text: "faster stamina", bonus: { staminaRegen: .35 } },
  windleaf: { name: "Windleaf", course: "salad", price: 10, text: "quicker feet", bonus: { move: .08 } },
  quickgrain: { name: "Quickgrain", course: "bake", price: 10, text: "faster attacks", bonus: { attackSpeed: .08 } },
  lumenCap: { name: "Lumen cap", course: "broth", price: 10, text: "faster spell recovery", bonus: { spellCooldown: .12 } },
  bloodmoss: { name: "Bloodmoss", course: "roast", price: 14, text: "world bosses find you sooner", bonus: { lureGap: .5, lureChance: 1 } },
};
export const INGREDIENT_IDS = Object.keys(INGREDIENTS);
// Release r467-8f36ab8aa5d6 (Codex audit F003): only the pantry's own ingredients, never inherited names like "constructor".
const isIngredient = (id) => typeof id === "string" && Object.hasOwn(INGREDIENTS, id);

export function ensureMeal(save) {
  const m = save?.meal;
  if (!m || typeof m !== "object" || !isIngredient(m.a) || !isIngredient(m.b) || !(Number(m.remaining) > 0)) { if (save && "meal" in save) delete save.meal; return null; }
  save.meal = { ...m, remaining: Math.min(MEAL.seconds, Number(m.remaining)) };
  return save.meal;
}
// The pair in pantry order, so A+B and B+A are the same dish.
const ordered = (a, b) => INGREDIENT_IDS.indexOf(a) <= INGREDIENT_IDS.indexOf(b) ? [a, b] : [b, a];
export function mealName(a, b) {
  [a, b] = ordered(a, b); const A = INGREDIENTS[a], B = INGREDIENTS[b];
  return a === b ? `Hearty ${A.name.toLowerCase()} ${A.course}` : `${A.name} and ${B.name.toLowerCase()} ${A.course}`;
}
export const mealPrice = (a, b) => (isIngredient(a) ? INGREDIENTS[a].price : 0) + (isIngredient(b) ? INGREDIENTS[b].price : 0);
// What a pair gives: the summed bonus fields.
export function mealBonus(a, b) {
  const out = {}; if (!isIngredient(a) || !isIngredient(b)) return out;
  const parts = a === b ? [[a, MEAL.hearty]] : [[a, 1], [b, 1]];
  for (const [id, k] of parts) for (const [f, v] of Object.entries(INGREDIENTS[id].bonus)) out[f] = (out[f] || 0) + v * k;
  return out;
}
// The bonus of the meal in effect now ({} when none).
export function activeMealBonus(save) { const m = save?.meal; return m && m.remaining > 0 ? mealBonus(m.a, m.b) : {}; }
// A few words on a pair's effects, for the menu and the buff line.
export function mealText(a, b) { return a === b ? `${INGREDIENTS[a].text}, a hearty helping` : `${INGREDIENTS[a].text}; ${INGREDIENTS[b].text}`; }
export function mealPercent(a, b) {
  const b2 = mealBonus(a, b), pct = (v) => `+${Math.round(v * 100)}%`, out = [];
  if (b2.attackDamage) out.push(`${pct(b2.attackDamage)} damage`); if (b2.hp) out.push(`${pct(b2.hp)} max health`); if (b2.staminaRegen) out.push(`${pct(b2.staminaRegen)} stamina recovery`);
  if (b2.move) out.push(`${pct(b2.move)} speed`); if (b2.attackSpeed) out.push(`${pct(b2.attackSpeed)} attack speed`); if (b2.spellCooldown) out.push(`${pct(b2.spellCooldown)} spell recovery`);
  if (b2.lureChance) out.push(`world bosses ${Math.round((1 + b2.lureChance) * 10) / 10}× as likely, sooner`);
  return out.join(", ");
}
// Eating at a cook: pays, replaces any meal in effect. Returns { ok, message }.
export function eatMeal(save, a, b, cook = "The cook") {
  if (!isIngredient(a) || !isIngredient(b)) return { ok: false, message: "That isn't in the pantry." };
  const price = mealPrice(a, b); if ((Number(save.currency) || 0) < price) return { ok: false, message: `${mealName(a, b)} costs ${price} marks; you have ${save.currency || 0}.` };
  const replaced = ensureMeal(save); save.currency -= price; [a, b] = ordered(a, b); save.meal = { a, b, remaining: MEAL.seconds };
  return { ok: true, message: `${cook} sets down ${mealName(a, b).toLowerCase()}. You eat it all: ${mealPercent(a, b)} for ${MEAL.seconds / 60} minutes.${replaced ? " It takes the place of your last meal." : ""}` };
}
// Play time passing. Returns true on the frame the meal runs out.
export function tickMeal(save, dt) {
  const m = save?.meal; if (!m || !(dt > 0)) return false;
  m.remaining = Math.max(0, (Number(m.remaining) || 0) - dt); if (m.remaining > 0) return false;
  delete save.meal; return true;
}
// World beasts (world-beasts.ts, questing-beast.ts): how many new sections the buffer needs, and the chance multiplier.
export function mealLure(save) { const b = activeMealBonus(save); return { gap: 1 - Math.min(.9, b.lureGap || 0), chance: 1 + (b.lureChance || 0) }; }
