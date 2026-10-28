// Field passives for the Transit Lattice (release 515; Tim, 2026-10-28: "passives... that don't purely depend on... a skill
// active... while your spell's going... if you stand inside of it... you get some extra buffs... healing... damage
// reduction... increased cooldown... your tool shots are larger... the passives that modify the Dodge").
//
// They exist only in the Lattice: drawn in from other histories, they need nothing learned. A key is `field:<id>` in
// save.lattice.passives (no new save state). "Your field" is one of your own lingering spells (a spell that holds for at
// least FIELD.minLife s: Ember Ring, Grave Sun, Gravity Well, Stillpoint, the perfect Orbit Volley's vortex) and you are in
// it while your centre is inside its radius. "A spell running" is any of your spells still in play: a field or a burst,
// Aegis, Shadow Boxing, your Shadow Clone, or Orbit Volley's gathering orbs. Pure data and rules; game.ts applies them.
import { latticePassives } from "./transit-lattice.ts";

export const FIELD = { minLife: 1 };
export const FIELD_PASSIVES = {
  sanctum: { name: "Sanctum", text: "Standing inside one of your lingering spells, you take 20% less damage and mend 2% of your health each second.", guard: .2, mend: .02 },
  wellspring: { name: "Wellspring Ground", text: "Standing inside one of your lingering spells, your spells, Aperture skills and tools recover 30% faster.", rate: .3 },
  "charged-air": { name: "Charged Air", text: "While one of your spells is running, tool shots fly 50% bigger, deal 25% more and burst 30% wider.", scale: 1.5, damage: .25, blast: 1.3, grow: .18 },
  spellblade: { name: "Spellblade", text: "While one of your spells is running, melee strikes (the Iron Fists too) deal 20% more and reach 0.4 tiles farther.", damage: .2, reach: .4 },
  "drift-field": { name: "Drift Field", text: "A dodge drags your nearest lingering spell (within 6 tiles) along: it settles where you land.", reach: 6 },
};
// Release 533 (tool-forms.ts): tool forms, Lattice-only passives that change how a tool works. Held like the field passives
// (keys `field:<id>`), listed apart from them.
export const TOOL_FORMS = {
  "arc-wave": { name: "Arc Wave", text: "The Blunderbuss fires one wide wave instead of its three-shot cone: it sweeps through every foe in its path. Still physical (Might)." },
  "cluster-shell": { name: "Cluster Shell", text: "When a Rift Bombard shell bursts, two bomblets fly off a short way and burst again. Still physical (Might)." }, // release 537
  "corridor-golem": { name: "Corridor Golem", text: "A Hammerfall blow raises a stone golem where it lands: it dashes to the nearest foe and punches up to three times, turning to the next when one falls, then sinks back into the floor. One at a time, at most every 6 s (less with faster tool recovery). Still physical (Might)." }, // release 535
  nanoknives: { name: "Nanoknives", text: "The Great Sweep raises three nanobot daggers that circle you. They throw themselves at any foe within 6 tiles and home in; with none near they wait. Press the tool to throw them early and raise a fresh set. Still physical (Might)." },
};
export const FIELD_KEYS = Object.keys(FIELD_PASSIVES).map((id) => `field:${id}`);
export const TOOL_FORM_KEYS = Object.keys(TOOL_FORMS).map((id) => `field:${id}`);
export function fieldForm(key) {
  const [kind, id] = String(key).split(":"), f = kind === "field" && (FIELD_PASSIVES[id] || TOOL_FORMS[id]);
  return f ? { id: key, field: true, alt: false, name: f.name, text: f.text } : null;
}
export const fieldOn = (save, id) => latticePassives(save).includes(`field:${id}`);
