// Aperture Constellation + Awakenings (release 100): itemization phase 3.
//
// Constellation: five branches (Form, Motion, Veil, Force, Rift). Each has its active discipline (ranks), one modifier
// node and two capstones. Release 109 (Tim, 2026-10-16): a mastered branch may take both capstones, one after the
// other (2 points each); the second is kept in `caps2`. Points come from Aperture (one per POINT_EVERY); ranks and
// modifiers cost 1, a capstone 2. Saves that learned ranks before this release keep them: any overspend becomes
// grandfathered bonus points. Respec happens only at shrines and costs lumen dust (operator decision 2026-10-14).
//
// Awakenings: a primary or tool at its upgrade cap whose sockets light a Resonance can be awakened at Sela's forge
// for lumen dust. An awakened weapon keeps its Resonance name and gains a new attack shape.
import { APERTURE_SKILLS, skillRank, UPGRADE_CAPS, itemTier, normalizeItemUpgrade, APERTURE_BANDS, apertureBand } from "./items.js?v=r383-083f6494ac81";
import { resonancesOf, RESONANCES, skillGlyphMods, skillInfusion, SKILL_INFUSE_AFTER_STEP, armorGlyphBonus } from "./glyphs.js?v=r383-083f6494ac81";
import { pairingMods } from "./spell-slots.js?v=r383-083f6494ac81";
import { latticePassives, toggleLatticeSlot } from "./transit-lattice.js?v=r383-083f6494ac81";
// Release 335: Rift Step recovers faster with the same reductions as every other skill (the pairing and armor Chain).
const riftCooldown = (save, rank, gm) => (APERTURE_SKILLS["rift-step"].cooldown - rank) * gm.cooldown * (altOn(save, "fold") ? ALT_PASSIVES.fold.cooldown : 1) * (1 - pairingMods(save).cooldown) * (1 - armorGlyphBonus(save).spellCooldown);

export const CONSTELLATION_VERSION = 1;
export const POINT_EVERY = 6;
export const AWAKEN_COST = 6; // lumen dust
// Rift Step distances in tiles: base reach (plus its rank), and the Long Step capstone's extra (release 259).
export const RIFT = { reach: 2, longStep: 2 };
export const BRANCHES = {
  form: { name: "Form", active: "ember-form", mod: { id: "ember-skin", name: "Ember Skin", text: "While Ember Form holds, your strikes set foes burning." }, caps: [
    { id: "colossus", name: "Colossus", text: "Ember Form lasts 50% longer and you take 15% less damage while it holds." },
    { id: "cinder-heart", name: "Cinder Heart", text: "When Ember Form ends it bursts, scorching everything around you." }] },
  motion: { name: "Motion", active: "quickening", mod: { id: "light-feet", name: "Light Feet", text: "Dodges cost 3 less stamina." }, caps: [
    { id: "aerial-step", name: "Aerial Step", text: "Learn Aerial Step: briefly cross water, canyons and pits." },
    { id: "slipstream", name: "Slipstream", text: "While Quickening holds, every dodge refunds its stamina." }] },
  veil: { name: "Veil", active: "veil-guard", mod: { id: "thorned-veil", name: "Thorned Veil", text: "While Veil Guard holds, the nearest foe takes back 30% of each blow." }, caps: [
    { id: "sanctuary", name: "Sanctuary", text: "Veil Guard mends 20% of your health over its duration." },
    { id: "mirror-veil", name: "Mirror Veil", text: "The first blow during Veil Guard is undone entirely." }] },
  force: { name: "Force", active: "force-channel", mod: { id: "overflow", name: "Overflow", text: "While Force Channel holds, spells recover 25% faster." }, caps: [
    { id: "amplifier", name: "Amplifier", text: "While Force Channel holds, glyph and Echo strikes deal 50% more." },
    { id: "resonant-force", name: "Resonant Force", text: "Kills during Force Channel extend it by 1 s." }] },
  rift: { name: "Rift", active: "rift-step", mod: { id: "rift-wake", name: "Rift Wake", text: "Rift Step tears a line that wounds foes you pass through." }, caps: [
    { id: "fold", name: "Fold", text: "Rift Step holds two charges." },
    // Release 259 (Tim: "it should not recall you back to a point... disable that"): the old Anchor recall is gone; the
    // capstone keeps its id (saves that took it keep it) and now lengthens the step instead.
    { id: "anchor", name: "Long Step", text: `Rift Step reaches ${RIFT.longStep} tiles farther. It still stops short of walls, ledges and ground it cannot stand on.` }] },
};
export const BRANCH_IDS = Object.keys(BRANCHES);
// How each modifier and capstone works (release 157, for the Arcanum's labels): "cast" is a new ability for slot A or B;
// "while" works only while the branch's discipline is active; "changes" alters how the discipline behaves; "always" is
// a permanent passive. `spells` names a node that also changes your spells (or the glyphs set in them).
export const NODE_EFFECTS = {
  "ember-skin": { kind: "while" }, colossus: { kind: "while" }, "cinder-heart": { kind: "changes" },
  "light-feet": { kind: "always" }, "aerial-step": { kind: "cast" }, slipstream: { kind: "while" },
  "thorned-veil": { kind: "while" }, sanctuary: { kind: "while" }, "mirror-veil": { kind: "while" },
  overflow: { kind: "while", spells: "Spells recover 25% faster." }, amplifier: { kind: "while", spells: "Glyph strikes from your spells deal 50% more." }, "resonant-force": { kind: "changes" },
  "rift-wake": { kind: "changes" }, fold: { kind: "changes" }, anchor: { kind: "changes" },
};

// Secondary passives (release 359; Tim, 2026-10-23: "develop an additional passive for each one that you can select...
// a button... it'll show the secondary passive... whenever you select this button, it'll just show whatever the opposite
// one is... available in infinite 3 and beyond"). Every modifier and capstone has a secondary form. From Infinite III
// (`ALT_UNLOCK_TIER`) a learned node can be switched between its primary and secondary form, freely; only the chosen
// form works. The choice is save.constellation.alt[nodeId] (additive). Numbers are data, read by the runtime hooks below.
export const ALT_UNLOCK_TIER = 13;
export const ALT_PASSIVES = {
  "ember-skin": { name: "Ember Ward", kind: "while", text: "While Ember Form holds, a foe that wounds you is set burning.", burnMs: 2500, burnDps: 3, burnPerLevel: .5, reach: 3 },
  colossus: { name: "Ember Mend", kind: "while", text: "Ember Form lasts 50% longer and mends 15% of your health over its duration.", duration: 1.5, mend: .15 },
  "cinder-heart": { name: "Kindling", kind: "changes", text: "When Ember Form begins it bursts, scorching everything around you.", radius: 2.6, damage: 10, perLevel: 2 },
  "light-feet": { name: "Second Wind", kind: "always", text: "Each dodge restores 3 health.", heal: 3 },
  "aerial-step": { name: "Long Quickening", kind: "changes", text: "Quickening lasts 50% longer. (Aerial Step cannot be cast while this is chosen.)", duration: 1.5 },
  slipstream: { name: "Afterimage", kind: "while", text: "While Quickening holds, each dodge leaves a burst where you started.", radius: 1.6, damage: 6, perLevel: 1 },
  "thorned-veil": { name: "Veil Pulse", kind: "while", text: "While Veil Guard holds, each blow you take pulses back at every foe within 2 tiles for 15% of it.", share: .15, reach: 2 },
  sanctuary: { name: "Long Veil", kind: "changes", text: "Veil Guard lasts 50% longer.", duration: 1.5 },
  "mirror-veil": { name: "Stillwater", kind: "while", text: "During Veil Guard you take 20% less damage.", guard: .2 },
  overflow: { name: "Wellspring", kind: "while", text: "While Force Channel holds, your Aperture skills recover 25% faster.", rate: .25 },
  amplifier: { name: "Bulwark Channel", kind: "while", text: "While Force Channel holds, you take 15% less damage.", guard: .15 },
  "resonant-force": { name: "Harvest", kind: "while", text: "Kills during Force Channel restore 4 health.", heal: 4 },
  "rift-wake": { name: "Rift Ward", kind: "changes", text: "After a Rift Step nothing can touch you for 0.6 s (instead of 0.15 s).", guardMs: 600 },
  fold: { name: "Quick Fold", kind: "changes", text: "Rift Step recovers 30% faster.", cooldown: .7 },
  anchor: { name: "Rift Echo", kind: "changes", text: "Rift Step leaves a burst where you stood, scorching foes there.", radius: 1.8, damage: 8, perLevel: 1 },
};
export const altUnlocked = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0)) >= ALT_UNLOCK_TIER;
// Is the secondary form chosen (and open) for a learned node?
export const altChosen = (save, id) => !!save?.constellation?.alt?.[id] && !!ALT_PASSIVES[id] && altUnlocked(save);
// The primary form works: the node is learned and its secondary is not chosen, or the Transit Lattice holds it (release 363).
export const nodeOn = (save, id) => hasNode(save, id) && (!altChosen(save, id) || latticePassives(save).includes(id));
// The secondary form works: chosen, or held in the Transit Lattice.
export const altOn = (save, id) => hasNode(save, id) && (altChosen(save, id) || latticePassives(save).includes(`${id}:alt`));
// Release 363: a passive form for the Transit Lattice. `key` is a node id (its primary form) or `id:alt` (its secondary).
export function passiveForm(key) {
  const [id, alt] = String(key).split(":"), node = Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps]).find((q) => q.id === id);
  if (!node || (alt && alt !== "alt")) return null;
  return alt ? { id, alt: true, name: ALT_PASSIVES[id].name, text: ALT_PASSIVES[id].text } : { id, alt: false, name: node.name, text: node.text };
}
export const PASSIVE_KEYS = Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps]).flatMap((n) => [n.id, `${n.id}:alt`]);
export function toggleLatticePassive(save, key) {
  const f = passiveForm(key); if (!f) return { ok: false, message: "That is not a passive." };
  return toggleLatticeSlot(save, "passive", key, f.name, () => !hasNode(save, f.id) ? `Learn ${passiveForm(f.id).name} first: the Lattice draws in a form of a passive you know.` : f.alt === altChosen(save, f.id) ? `${f.name} already works: it is the form you have chosen.` : "");
}
export function toggleAlt(save, id) {
  const alt = ALT_PASSIVES[id];
  if (!alt) return { ok: false, message: "That entry has no secondary form." };
  if (!altUnlocked(save)) return { ok: false, message: `Secondary passives open at the ${APERTURE_BANDS[ALT_UNLOCK_TIER].name} band of the Aperture.` };
  if (!hasNode(save, id)) return { ok: false, message: "Learn it first." };
  const c = save.constellation; c.alt ||= {};
  if (c.alt[id]) delete c.alt[id]; else c.alt[id] = true;
  const primary = Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps]).find((q) => q.id === id);
  return { ok: true, message: c.alt[id] ? `${alt.name} (secondary) replaces ${primary.name}.` : `${primary.name} (primary) is back in place of ${alt.name}.` };
}

// ---------------------------------------------------------------- state and points
export function ensureConstellation(save) {
  save.magicSkills ||= { schema: 1, learned: {}, selected: null, active: null, cooldowns: {}, lastSafe: null };
  const c = save.constellation && typeof save.constellation === "object" ? save.constellation : {};
  const caps = Object.fromEntries(Object.entries(c.caps || {}).filter(([b, id]) => BRANCHES[b]?.caps.some((q) => q.id === id)));
  const caps2 = Object.fromEntries(Object.entries(c.caps2 || {}).filter(([b, id]) => caps[b] && caps[b] !== id && BRANCHES[b]?.caps.some((q) => q.id === id)));
  const alt = Object.fromEntries(Object.keys(c.alt || {}).filter((id) => c.alt[id] === true && ALT_PASSIVES[id]).map((id) => [id, true])); // release 359
  save.constellation = { version: CONSTELLATION_VERSION, mods: { ...c.mods }, caps, caps2, bonus: Math.max(0, Math.floor(Number(c.bonus) || 0)), ...(Object.keys(alt).length ? { alt } : {}) };
  // Reconciled on every load, so saves from before this release (or merged with fresh defaults) keep what they learned:
  // a learned Aerial Step claims the Motion capstone, and any overspend becomes grandfathered bonus points.
  if (skillRank(save, "aerial-step") > 0 && !hasNode(save, "aerial-step")) { if (!save.constellation.caps.motion) save.constellation.caps.motion = "aerial-step"; else save.constellation.caps2.motion = "aerial-step"; }
  save.constellation.bonus = Math.max(save.constellation.bonus, pointsSpent(save) - pointsEarned(save));
  return save;
}
export const pointsEarned = (save) => Math.floor(Math.max(0, Number(save.perception?.aperture) || 0) / POINT_EVERY);
export function pointsSpent(save) {
  const c = save.constellation || { mods: {}, caps: {} };
  let n = 0;
  for (const b of Object.values(BRANCHES)) n += skillRank(save, b.active);
  n += Object.values(c.mods || {}).filter(Boolean).length + 2 * (Object.keys(c.caps || {}).length + Object.keys(c.caps2 || {}).length);
  return n;
}
export const pointsFree = (save) => pointsEarned(save) + (save.constellation?.bonus || 0) - pointsSpent(save);
export const hasNode = (save, id) => !!save.constellation && (!!save.constellation.mods[id] || Object.values(save.constellation.caps || {}).includes(id) || Object.values(save.constellation.caps2 || {}).includes(id));
// Capstones a branch holds (first, then second).
export const branchCaps = (save, branch) => [save.constellation?.caps?.[branch], save.constellation?.caps2?.[branch]].filter(Boolean);

export function learnRank(save, branch) {
  const b = BRANCHES[branch], skill = APERTURE_SKILLS[b?.active];
  if (!skill) return { ok: false, message: "Unknown branch." };
  const rank = skillRank(save, skill.id);
  if ((save.perception?.aperture || 0) < skill.threshold) return { ok: false, message: `${skill.name} opens at Aperture ${skill.threshold}.` };
  if (rank >= skill.maxRank) return { ok: false, message: `${skill.name} is fully learned.` };
  if (pointsFree(save) < 1) return { ok: false, message: `No constellation points free (one per ${POINT_EVERY} Aperture).` };
  save.magicSkills.learned[skill.id] = rank + 1;
  if (!save.magicSkills.selected) save.magicSkills.selected = skill.id;
  return { ok: true, message: `${skill.name} rank ${rank + 1} learned.` };
}
export function learnMod(save, branch) {
  const b = BRANCHES[branch];
  if (!b) return { ok: false, message: "Unknown branch." };
  if (save.constellation.mods[b.mod.id]) return { ok: false, message: `${b.mod.name} is already yours.` };
  if (skillRank(save, b.active) < 1) return { ok: false, message: `Learn ${APERTURE_SKILLS[b.active].name} first.` };
  if (pointsFree(save) < 1) return { ok: false, message: "No constellation points free." };
  save.constellation.mods[b.mod.id] = true;
  return { ok: true, message: `${b.mod.name} joins the constellation.` };
}
export function chooseCap(save, branch, capId) {
  const b = BRANCHES[branch], cap = b?.caps.find((q) => q.id === capId);
  if (!cap) return { ok: false, message: "Unknown capstone." };
  if (branchCaps(save, branch).includes(capId)) return { ok: false, message: `${cap.name} already crowns the ${b.name} branch.` };
  if (!save.constellation.mods[b.mod.id]) return { ok: false, message: `Take ${b.mod.name} first.` };
  if (skillRank(save, b.active) < APERTURE_SKILLS[b.active].maxRank) return { ok: false, message: `Master ${APERTURE_SKILLS[b.active].name} first.` };
  if (pointsFree(save) < 2) return { ok: false, message: "A capstone needs 2 free points." };
  save.constellation.caps2 ||= {};
  if (save.constellation.caps[branch]) save.constellation.caps2[branch] = capId; else save.constellation.caps[branch] = capId;
  if (capId === "aerial-step") { save.magicSkills.learned["aerial-step"] = 1; }
  return { ok: true, message: `${cap.name} crowns the ${b.name} branch.` };
}
export const respecCost = (save) => 2 + Math.ceil(pointsSpent(save) / 2);
// Only at shrines (the UI offers it there). Refunds every rank, modifier and capstone; grandfathered bonus stays.
export function respec(save) {
  const cost = respecCost(save), dust = save.materials?.lumenDust || 0;
  if (pointsSpent(save) === 0) return { ok: false, message: "Nothing to unlearn." };
  if (dust < cost) return { ok: false, message: `Respec needs ${cost} lumen dust (you have ${dust}).` };
  save.materials.lumenDust = dust - cost;
  save.magicSkills.learned = {}; save.magicSkills.selected = null; save.magicSkills.active = null;
  save.constellation.mods = {}; save.constellation.caps = {}; save.constellation.caps2 = {}; delete save.constellation.alt;
  return { ok: true, message: `The shrine takes ${cost} lumen dust. Your constellation is unwritten.` };
}

// ---------------------------------------------------------------- runtime hooks (called by Game)
const activeIs = (save, id) => save.magicSkills?.active?.id === id && save.magicSkills.active.remaining > 0;
export function skillDurationScale(save, id) {
  if (id === "ember-form") return nodeOn(save, "colossus") ? 1.5 : altOn(save, "colossus") ? ALT_PASSIVES.colossus.duration : 1;
  if (id === "quickening" && altOn(save, "aerial-step")) return ALT_PASSIVES["aerial-step"].duration; // release 359
  if (id === "veil-guard" && altOn(save, "sanctuary")) return ALT_PASSIVES.sanctuary.duration;
  return 1;
}
export function extraReduction(save) {
  return (activeIs(save, "ember-form") && nodeOn(save, "colossus") ? .15 : 0) + (activeIs(save, "veil-guard") && altOn(save, "mirror-veil") ? ALT_PASSIVES["mirror-veil"].guard : 0) + (activeIs(save, "force-channel") && altOn(save, "amplifier") ? ALT_PASSIVES.amplifier.guard : 0); // release 359: Stillwater, Bulwark Channel
}
export function strikeAmplifier(save) { return activeIs(save, "force-channel") && nodeOn(save, "amplifier") ? 1.5 : 1; }
export function onConstellationDodge(game) {
  const s = game.save, p = game.player;
  if (nodeOn(s, "light-feet")) p.stamina = Math.min(s.maxStamina, p.stamina + 3);
  if (altOn(s, "light-feet") && p.hp > 0) p.hp = Math.min(s.maxHp, p.hp + ALT_PASSIVES["light-feet"].heal); // release 359: Second Wind
  if (activeIs(s, "quickening") && nodeOn(s, "slipstream")) p.stamina = Math.min(s.maxStamina, p.stamina + 15);
  if (activeIs(s, "quickening") && altOn(s, "slipstream")) { const A = ALT_PASSIVES.slipstream; game.glyphWorld(game.lastUpdateNow || 0).blast(p.x + .5, p.y + .45, A.radius, A.damage + A.perLevel * (s.level || 1)); } // Afterimage
}
export function onConstellationMelee(game, e, now) {
  if (activeIs(game.save, "ember-form") && nodeOn(game.save, "ember-skin")) e.glyphBurn = { until: Math.max(e.glyphBurn?.until || 0, now + 2500), dps: Math.max(e.glyphBurn?.dps || 0, 3 + Math.round((game.save.level || 1) * .5)), tick: e.glyphBurn?.tick || 0 };
}
export function onConstellationKill(game) {
  const st = game.save.magicSkills;
  if (activeIs(game.save, "force-channel") && nodeOn(game.save, "resonant-force")) st.active.remaining = Math.min(st.active.remaining + 1, 20);
  if (activeIs(game.save, "force-channel") && altOn(game.save, "resonant-force") && game.player.hp > 0) game.player.hp = Math.min(game.save.maxHp, game.player.hp + ALT_PASSIVES["resonant-force"].heal); // release 359: Harvest
}
export function onSkillEnded(game, id, now) {
  if (id === "ember-form" && nodeOn(game.save, "cinder-heart")) game.glyphWorld(now).blast(game.player.x + .5, game.player.y + .45, 2.6, 10 + 2 * (game.save.level || 1));
}
// Per frame: veil nodes react to wounds, Sanctuary mends, Overflow speeds spells.
export function tickConstellation(game, dt, now) {
  const s = game.save, p = game.player, lost = game._cLastHp !== undefined ? game._cLastHp - p.hp : 0;
  const near = (r) => game.enemies.filter((e) => !e.dead && !e.untargetable && Math.hypot(e.x - p.x, e.y - p.y) < r);
  if (activeIs(s, "ember-form")) { // release 359: Kindling (when it begins), Ember Ward, Ember Mend
    const st = s.magicSkills.active;
    if (altOn(s, "cinder-heart") && !st.kindled) { st.kindled = true; const A = ALT_PASSIVES["cinder-heart"]; game.glyphWorld(now).blast(p.x + .5, p.y + .45, A.radius, A.damage + A.perLevel * (s.level || 1)); }
    if (lost > 0 && p.hp > 0 && altOn(s, "ember-skin")) { const A = ALT_PASSIVES["ember-skin"], foe = near(A.reach).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (foe) foe.glyphBurn = { until: Math.max(foe.glyphBurn?.until || 0, now + A.burnMs), dps: Math.max(foe.glyphBurn?.dps || 0, A.burnDps + Math.round((s.level || 1) * A.burnPerLevel)), tick: foe.glyphBurn?.tick || 0 }; }
    if (altOn(s, "colossus")) { const skill = APERTURE_SKILLS["ember-form"], span = (skill.duration + Math.max(0, skillRank(s, "ember-form") - 1)) * ALT_PASSIVES.colossus.duration; game._cEmber = (game._cEmber || 0) + s.maxHp * ALT_PASSIVES.colossus.mend / span * dt; const whole = Math.floor(game._cEmber); if (whole) { game._cEmber -= whole; p.hp = Math.min(s.maxHp, p.hp + whole); } }
  }
  if (activeIs(s, "veil-guard")) {
    if (lost > 0 && p.hp > 0) {
      if (altOn(s, "thorned-veil")) { const A = ALT_PASSIVES["thorned-veil"]; for (const foe of near(A.reach)) game.glyphWorld(now).damage(foe, Math.max(1, Math.round(lost * A.share))); } // release 359: Veil Pulse
      if (nodeOn(s, "mirror-veil") && !s.magicSkills.active.mirrored) { s.magicSkills.active.mirrored = true; p.hp += lost; game.message = "Mirror Veil turns the blow aside."; }
      else if (nodeOn(s, "thorned-veil")) { const foe = game.enemies.filter((e) => !e.dead && !e.untargetable).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (foe && Math.hypot(foe.x - p.x, foe.y - p.y) < 3) game.glyphWorld(now).damage(foe, Math.max(2, Math.round(lost * .3))); }
    }
    if (nodeOn(s, "sanctuary")) { const skill = APERTURE_SKILLS["veil-guard"], span = skill.duration + Math.max(0, skillRank(s, "veil-guard") - 1); game._cMend = (game._cMend || 0) + s.maxHp * .2 / span * dt; const whole = Math.floor(game._cMend); if (whole) { game._cMend -= whole; p.hp = Math.min(s.maxHp, p.hp + whole); } }
  }
  if (activeIs(s, "force-channel") && altOn(s, "overflow")) for (const k of Object.keys(s.magicSkills?.cooldowns || {})) if (!k.startsWith("spell:") && k !== "force-channel") s.magicSkills.cooldowns[k] = Math.max(0, s.magicSkills.cooldowns[k] - dt * ALT_PASSIVES.overflow.rate); // release 359: Wellspring
  if (activeIs(s, "force-channel") && nodeOn(s, "overflow")) { game.spellCooldownRemaining = Math.max(0, game.spellCooldownRemaining - dt * .25); for (const k of Object.keys(s.magicSkills?.cooldowns || {})) if (k.startsWith("spell:")) s.magicSkills.cooldowns[k] = Math.max(0, s.magicSkills.cooldowns[k] - dt * .25); }
  game._cLastHp = p.hp;
}
// Rift Step: an instant blink along the move (or aim) direction, stopping before walls, hazards and climbs.
export function riftStep(game, now) {
  const s = game.save, st = s.magicSkills, rank = skillRank(s, "rift-step"), p = game.player, world = game.glyphWorld(now);
  if (!rank) { game.message = "Rift Step has not been learned."; return false; }
  if (st.riftAnchor) delete st.riftAnchor; // release 259: no recall; a recall point left by an older release is dropped
  const gm = skillGlyphMods(s, "rift-step"), charges = (nodeOn(s, "fold") ? 2 : 1) + gm.charges; // release 297: glyphs (Echo: a charge)
  st.riftCharges = Math.min(charges, st.riftCharges ?? charges);
  if (st.riftCharges < 1) { game.message = `Rift Step recovers in ${Math.ceil(st.cooldowns["rift-step"] || 0)}s.`; return false; }
  const d = p.lastMoveVector || s.lastAim || { x: 0, y: 1 }, m = Math.hypot(d.x, d.y) || 1, dx = d.x / m, dy = d.y / m, reach = RIFT.reach + rank + (nodeOn(s, "anchor") ? RIFT.longStep : 0) + gm.reach;
  const startElev = game.elevationHere ? game.elevationHere(p.x, p.y) : 0, from = { x: p.x, y: p.y };
  let best = null;
  for (let t = .25; t <= reach + 1e-6; t += .25) {
    const x = from.x + dx * t, y = from.y + dy * t;
    if (!world.canStand(x, y)) break;
    if (game.elevationHere && game.elevationHere(x, y) > startElev) break; // never blink up a ledge
    best = { x, y };
  }
  if (!best) { game.message = "There is no room to step through."; return false; }
  if (altOn(s, "anchor")) { const A = ALT_PASSIVES.anchor; world.blast(from.x + .5, from.y + .45, A.radius, A.damage + A.perLevel * (s.level || 1)); } // release 359: Rift Echo
  if (nodeOn(s, "rift-wake")) { const hit = new Set(); for (let t = 0; t <= Math.hypot(best.x - from.x, best.y - from.y); t += .4) for (const e of game.enemies) if (!e.dead && !e.untargetable && !hit.has(e.id) && Math.hypot(e.x - (from.x + dx * t), e.y - (from.y + dy * t)) < .8) { hit.add(e.id); world.damage(e, 6 + Math.round(1.5 * (s.level || 1))); } }
  (game.glyphVisuals ||= []).push({ kind: "arc", x: from.x + .5, y: from.y + .45, tx: best.x + .5, ty: best.y + .45, color: "#b48cff", life: .3, max: .3 });
  p.x = best.x; p.y = best.y; p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + (altOn(s, "rift-wake") ? ALT_PASSIVES["rift-wake"].guardMs : 150));
  st.riftCharges -= 1; st.cooldowns["rift-step"] = Math.max(st.cooldowns["rift-step"] || 0, riftCooldown(s, rank, gm));
  if (skillInfusion({ magicSkills: { riftInfuse: 1 }, spellGlyphs: s.spellGlyphs }).length) st.riftInfuse = SKILL_INFUSE_AFTER_STEP; // release 297: its glyphs ride on hits for a while
  game.message = "Rift Step."; game.sync();
  return true;
}
export function tickRiftCharges(save) {
  const st = save.magicSkills; if (!st || !skillRank(save, "rift-step")) return;
  const gm = skillGlyphMods(save, "rift-step"), charges = (nodeOn(save, "fold") ? 2 : 1) + gm.charges;
  if ((st.cooldowns["rift-step"] || 0) <= 0 && (st.riftCharges ?? charges) < charges) { st.riftCharges = (st.riftCharges ?? 0) + 1; if (st.riftCharges < charges) st.cooldowns["rift-step"] = riftCooldown(save, skillRank(save, "rift-step"), gm); }
}

// ---------------------------------------------------------------- awakenings
export function awakenCheck(save, slot) {
  const item = save.equipment?.[slot];
  if (!item || (slot !== "primary" && slot !== "secondary")) return { ok: false, message: "Only a primary weapon or a tool can awaken." };
  if (item.awakened) return { ok: false, message: `${item.name} is already awakened.` };
  const n = normalizeItemUpgrade(item), cap = UPGRADE_CAPS[itemTier(n)];
  if ((n.upgradeRank || 0) < cap) return { ok: false, message: `Strengthen ${item.name} to +${cap} first (now +${n.upgradeRank || 0}).` };
  const reso = resonancesOf(item.glyphs || []);
  if (!reso.length) return { ok: false, message: `${item.name} must hold a Resonance in its sockets.` };
  return { ok: true, resonance: reso[0], message: `${item.name} can awaken in ${RESONANCES[reso[0]].name}.` };
}
export function awaken(save, slot) {
  const check = awakenCheck(save, slot);
  if (!check.ok) return check;
  if ((save.materials.lumenDust || 0) < AWAKEN_COST) return { ok: false, message: `Awakening needs ${AWAKEN_COST} lumen dust.` };
  save.materials.lumenDust -= AWAKEN_COST;
  const item = save.equipment[slot];
  item.awakened = { resonance: check.resonance, version: CONSTELLATION_VERSION };
  return { ok: true, message: `${item.name} awakens in ${RESONANCES[check.resonance].name}. ${slot === "primary" ? "Every third swing now releases a piercing crescent." : "Every shot now fans into three."}` };
}
export const awakenedText = (item) => item?.awakened ? `Awakened · ${RESONANCES[item.awakened.resonance]?.name || "Resonance"} · ${item.slot === "primary" ? "every third swing releases a piercing crescent" : "every shot fans into three"}` : "";
