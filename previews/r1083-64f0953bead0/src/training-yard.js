// Progression Phase 5: the training yard (docs/progression-design.md revision 3, 4A.4 option (i) and section 7 row 5; Tim
// approved 2026-11-20). An owned ability's how-to page offers "Try it": the journey is flushed and handed to the Proving Ground
// through the release-791 handoff (proving-ground-handoff.ts: one copy, into the laboratory's own database, taken once), where
// the "Training Yard" preset plays that copy on the Standard Test Tile with practice dummies and a foe suited to the ability.
// Back to your journey reloads the production page, which resumes the journey it flushed, untouched.
//
// Pure data and pure reads, plus `lendYardAbility`, which readies the chosen ability on a SCRATCH save only (a slot, a notch,
// the gear in hand). Nothing here opens storage or names a production key. Only what the Wayfarer already owns is offered or
// lent (Tim, 2026-11-20: it must not become a free preview of quest rewards): an id that is not owned is refused.
// Later (4A.4 option (ii), not built yet): a sparring post in Ember Refuge and each Listener town.
import { ROW_BY_ID, ROW_ALIASES, progressionState } from "./progression.js?v=r1083-64f0953bead0";
import { CASTABLES, ensureSlots, setSlot, SLOTS, slotLabel } from "./spell-slots.js?v=r1083-64f0953bead0";
import { ECHOES, NOTCHES, ensureEchoState, notchesUsed, toggleEcho, activeEchoes } from "./echoes.js?v=r1083-64f0953bead0";
import { weaponKey, toolKey } from "./items.js?v=r1083-64f0953bead0";
import { equipInventoryItem } from "./game.js?v=r1083-64f0953bead0";

// What the yard holds for each kind of ability. Data, so the setups can be tuned without touching the logic.
//   dummies  practice dummies: still, harmless and durable (game.ts passiveBehavior "practice"), `hp` each
//   cluster  true: the dummies stand close together (for spells that hit an area)
//   foes     ordinary foes that fight back (one, for timing parries and dodges against real blows)
export const TRAINING_YARD = Object.freeze({
  name: "Training Yard",
  button: "Try it",
  practice: "Practice: nothing here is kept",
  back: "Back to your journey",
  version: 1,
  dummy: Object.freeze({ kind: "ashling", hp: 5000 }),
  ring: Object.freeze({ near: 3, far: 6, foe: 8 }), // tiles from the Wayfarer: dummies between near and far, foes at about foe
  setups: Object.freeze({
    standard: Object.freeze({ dummies: 3, cluster: false, foes: Object.freeze(["ashling"]), text: "Three practice dummies and one ordinary foe." }),
    area: Object.freeze({ dummies: 5, cluster: true, foes: Object.freeze([]), text: "Five practice dummies standing close together." }),
    parry: Object.freeze({ dummies: 1, cluster: false, foes: Object.freeze(["rootBrute"]), text: "A practice dummy and a foe that swings, to time it against." }),
    ground: Object.freeze({ dummies: 0, cluster: false, foes: Object.freeze([]), text: "Open ground, water, a chasm and raised blocks with stairs." }),
  }),
  // Groups the yard offers (anything a dummy can show); marginalia need a crossing, supplies are spent, mounts live in the stable.
  groups: Object.freeze({ disciplines: "standard", spells: "standard", nodes: "standard", forms: "standard", lattice: "standard", arcana: "standard", arts: "standard", awakened: "standard", gear: "standard", echoes: "standard", glyphs: "standard", traversal: "ground" }),
  byId: Object.freeze({
    "spell:aegis": "parry", "skill:veil-guard": "parry", "spell:shadow-boxing": "parry",
    "spell:ember-ring": "area", "spell:grave-sun": "area", "spell:fire-burst": "area", "spell:gravity-well": "area", "spell:stillpoint": "area", "spell:orbit-volley": "area",
    "skill:quickening": "ground", "skill:aerial-step": "ground", "skill:rift-step": "ground",
  }),
});

const rowOf = (id) => ROW_BY_ID[ROW_ALIASES[id] || id] || null;
export const yardName = (id) => rowOf(id)?.name || "";
// The setup an ability gets in the yard, or null when the yard has nothing for it.
export function yardSetup(id) {
  const row = rowOf(id); if (!row) return null;
  const key = TRAINING_YARD.byId[row.id] || TRAINING_YARD.groups[row.group];
  return key ? { key, ...TRAINING_YARD.setups[key] } : null;
}
// Owned under the journey's own rules (Classic or Exploration): "open" (could be taken) and "rumoured" are not owned.
export const yardOwned = (save, id) => { const row = rowOf(id); return !!row && progressionState(save, row) === "owned"; };
// The how-to page's Try it: { id, name, setup } for an owned ability the yard can show, else null (no button).
export function yardOffer(save, id) {
  const row = rowOf(id), setup = yardSetup(id);
  if (!row || !setup || !yardOwned(save, row.id)) return null;
  return { id: row.id, name: row.name, setup: setup.key };
}
// Why an ability cannot be lent to this save ("" when it can).
export function yardRefusal(save, id) {
  const row = rowOf(id);
  if (!row) return "The Training Yard does not know that ability.";
  if (!yardSetup(row.id)) return `${row.name} cannot be practised in the Training Yard.`;
  if (!yardOwned(save, row.id)) return `${row.name} is not yours yet. The Training Yard lends only what you own.`;
  return "";
}

// Readies an owned ability on a scratch save: a spell or discipline into slot B (the first spell slot; or where it already sits),
// an Echo into the notches, the weapon, tool, armour or charm into your hands. Everything else (passives, nodes, forms, arts,
// glyphs, traversal) is already part of the kit and needs nothing. Throws for an id that is not owned: nothing is granted.
// Returns the one line the yard shows.
export function lendYardAbility(save, id) {
  const refused = yardRefusal(save, id); if (refused) throw new Error(refused);
  const row = rowOf(id), [kind, a, b] = row.own;
  if (CASTABLES[row.id]) {
    const slots = ensureSlots(save), at = SLOTS.find((q) => slots[q] === row.id);
    if (at) return `${row.name} is in slot ${slotLabel(at)}.`;
    const set = setSlot(save, "a", row.id); if (!set.ok) throw new Error(`${row.name}: ${set.message}`);
    return `${row.name} is in slot ${slotLabel("a")}.`;
  }
  if (kind === "echo") {
    ensureEchoState(save);
    if (activeEchoes(save).includes(a)) return `${row.name} is set.`;
    while (save.echoes.equipped.length && notchesUsed(save.echoes.equipped) + (ECHOES[a]?.cost || 0) > NOTCHES) save.echoes.equipped.pop();
    const set = toggleEcho(save, a); if (!set.ok) throw new Error(set.message);
    return `${row.name} is set in your notches.`;
  }
  if (kind === "gear") {
    const slot = a === "tool" ? "secondary" : a === "primary" ? "primary" : null;
    const fits = (q) => q && (slot === "primary" ? q.slot === "primary" && weaponKey(q) === b : slot === "secondary" ? q.slot === "secondary" && toolKey(q) === b : q.name === row.name);
    if (Object.values(save.equipment || {}).some(fits)) return `${row.name} is in your hands.`;
    const index = (Array.isArray(save.inventory) ? save.inventory : []).findIndex(fits);
    if (index >= 0 && equipInventoryItem(save, index)) return `${row.name} is in your hands.`;
    return `${row.name}: equip it in Pack → Gear.`;
  }
  return `${row.name} is part of your kit.`;
}
// The handoff's yard request (proving-ground-handoff.ts handoffRecord): only for an owned ability the yard can show.
export function yardRequest(save, id) {
  const refused = yardRefusal(save, id); if (refused) throw new Error(refused);
  return { ability: rowOf(id).id, version: TRAINING_YARD.version };
}
