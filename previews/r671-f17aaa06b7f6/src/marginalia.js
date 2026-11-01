// Marginalia (release 459; Tim, 2026-10-26: "each time you go into a dungeon... you can find different marginalia, and
// they'll change how you play in the dungeon... after Infinite 4... more of a roguelite... perks that last for the dungeon
// ... a Scrapbook... you can paste them in when you get into the dungeon... several guardians in the dungeon... killing one
// is the one that you need to exit... as you kill a guardian, you get to select different marginalia... for the rest of
// the play through that dungeon... they call in reinforcements... so you get to play with the marginalia").
//
// From Infinite IV (`RULES.tier`), every ordinary crossing holds Margin Wardens: optional guardians apart from the one
// that opens the way out. Felling one offers `RULES.offer` marginalia; the one chosen goes into the Scrapbook for good and
// works for the rest of this crossing, and the crossing calls in reinforcements to meet it. On entering a crossing you may
// paste one marginalia from the Scrapbook in at once. A marginalia rewrites one rule of your kit for the run only; it ends
// when you leave the crossing (by any way, including a fall). State: save.marginalia = { found: [ids] } (additive,
// normalised); the run, save.session.marginRun = { dungeon, perks, secondWind, offer } (session; exact resume).
// Balance lives in the tables below. Pure rules: no DOM.
import { hashSeed } from "./random.js?v=r671-f17aaa06b7f6";
import { apertureTier } from "./world.js?v=r671-f17aaa06b7f6";
import { LETHAL_KINDS } from "./landscape.js?v=r671-f17aaa06b7f6";

export const RULES = { tier: 14, offer: 3, pasteSlots: 1, wardensBySize: [[1100, 3], [500, 2], [0, 1]], wardenMinFromEntry: 9, wardenApart: 7,
  // Release 473 (Tim: "the wardens need to be... significantly stronger... about half the strength of the Gate Revenant...
  // more compelling moves... put in some of the elite monsters as wardens"): a warden is one of the elite monsters, tuned
  // to `revenantShare` of the Gate Revenant's health and damage for this Wayfarer.
  warden: { revenantShare: .5, scale: 1.1, elites: ["vesperwing", "gravitantBell", "mireApostle", "knifeChoir"] }, reinforcements: { count: 5, minFromPlayer: 7, liveCap: 28 } };
// Each marginalia: what it says, and either `bonus` (fields of the gear bonus, game.ts armorGlyphBonus) or an event rule
// handled where it happens (`rule`).
export const MARGINALIA = {
  glassEdge: { name: "Glass Edge", text: "Your blows and spells deal 30% more, and you take 20% more.", bonus: { attackDamage: .3, spellDamage: .3, defense: -.2 } },
  ironSpine: { name: "Iron Spine", text: "You take 20% less damage, and move 10% slower.", bonus: { defense: .2, move: -.1 } },
  fleetHand: { name: "Fleet Hand", text: "You move 20% faster, and a dodge costs half the stamina.", bonus: { move: .2, dodgeCost: .5 } },
  quickHand: { name: "Quick Hand", text: "You attack 20% faster.", bonus: { attackSpeed: .2 } },
  wideFocus: { name: "Wide Focus", text: "Spells and skills recover 30% faster.", bonus: { spellCooldown: .3 } },
  emberWake: { name: "Ember Wake", text: "Every dodge leaves a burst of embers that burns whatever stands in it.", rule: "dodgeBurst" },
  redMargin: { name: "Red Margin", text: "Every foe you fell mends 4% of your health.", rule: "killMend" },
  quickInk: { name: "Quick Ink", text: "Felling a warden or a guardian makes every spell and skill ready again.", rule: "guardianRefresh" },
  secondWind: { name: "Second Wind", text: "Once in this crossing, a blow that would fell you leaves you standing at a third of your health.", rule: "secondWind" },
  // Release 461 (Tim: "each dodge leaves behind a shadow clone for like 3 seconds... another one could be just cool down...
  // come up with... more, so we have 20"): eleven more.
  shadowStep: { name: "Shadow Step", text: "Every dodge leaves your shadow behind you for 3 seconds, repeating your attacks at half strength.", rule: "dodgeShadow" },
  hourglass: { name: "Hourglass", text: "Every foe you fell takes a second off every spell and skill still recovering.", rule: "killCooldown" },
  lifeblood: { name: "Lifeblood", text: "Your maximum health rises by a quarter.", bonus: { hp: .25 } },
  deepLungs: { name: "Deep Lungs", text: "Stamina recovers 60% faster.", bonus: { staminaRegen: .6 } },
  heavyHand: { name: "Heavy Hand", text: "Your blows deal 40% more, and come 15% slower.", bonus: { attackDamage: .4, attackSpeed: -.15 } },
  inkwell: { name: "Inkwell", text: "Your spells and magic shots deal 40% more, and your blows 15% less.", bonus: { spellDamage: .4, attackDamage: -.15 } },
  longArm: { name: "Long Arm", text: "Your reach grows by 30%.", bonus: { reach: .3 } },
  inkShield: { name: "Ink Shield", text: "Every 10 seconds, the next hit you take does you no harm.", rule: "hitShield" },
  gildedMargin: { name: "Gilded Margin", text: "Every foe you fell drops 3 more marks.", rule: "killMarks" },
  smithsNote: { name: "Smith's Note", text: "A fallen warden or guardian leaves a weapon or armor sphere.", rule: "guardianSphere" },
  sigilPage: { name: "Sigil Page", text: "A fallen warden leaves a Crossing Sigil.", rule: "wardenSigil" },
};
export const MARGINALIA_IDS = Object.keys(MARGINALIA);
const isMarginalia = (id) => typeof id === "string" && Object.hasOwn(MARGINALIA, id); // release 467 (Codex audit F003)
export const EMBER_WAKE = { radius: 1.8, base: 14, perLevel: 1.2 };
export const RED_MARGIN = { share: .04 };
export const SECOND_WIND = { share: 1 / 3, guardMs: 1500 };
export const SHADOW_STEP = { seconds: 3, behind: 2 };
export const HOURGLASS = { seconds: 1 };
export const INK_SHIELD = { seconds: 10 };
export const GILDED = { marks: 3 };

export function ensureMarginalia(save) {
  const found = (Array.isArray(save?.marginalia?.found) ? save.marginalia.found : []).filter((id, i, a) => isMarginalia(id) && a.indexOf(id) === i);
  if (!save.marginalia && !found.length) return { found };
  save.marginalia = { ...(save.marginalia || {}), found }; return save.marginalia;
}
export const marginaliaOpen = (save) => apertureTier(save?.perception?.aperture || 0) >= RULES.tier;
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
export const marginCrossing = (dungeonId) => ORDINARY.test(String(dungeonId || ""));

// The run in this crossing (its annex counts as the same crossing), or null.
export function marginRun(save, areaId) { const r = save?.session?.marginRun; return r && areaId && String(areaId).startsWith(r.dungeon) ? r : null; }
export function beginMarginRun(save, dungeonId) { save.session.marginRun = { dungeon: dungeonId, perks: [], secondWind: false, offer: null }; return save.session.marginRun; }
export function endMarginRun(save) { if (save?.session?.marginRun) save.session.marginRun = null; }
export function runHas(save, areaId, id) { return !!marginRun(save, areaId)?.perks.includes(id); }
// The summed stat bonus of the run's marginalia ({} with none).
export function marginBonus(save, areaId) {
  const out = {}, r = marginRun(save, areaId); if (!r) return out;
  for (const id of r.perks) if (isMarginalia(id)) for (const [k, v] of Object.entries(MARGINALIA[id].bonus || {})) out[k] = (out[k] || 0) + v;
  return out;
}

// Wardens for a crossing: reachable floor (walked from the entry, so none stands sealed in rock), far from the entry and
// from each other, by seed. Returns spawn records for map.enemySpawns.
export function wardenSpawns(save, map, dungeonId, slain = []) {
  if (!marginaliaOpen(save) || !marginCrossing(dungeonId) || !map?.tiles?.length || map.multiLevel || map.arena || map.underwater) return [];
  const w = map.width || 24, h = Math.floor(map.tiles.length / w), e = map.entry || { x: 4, y: 5 }, start = Math.round(e.y) * w + Math.round(e.x), seen = new Uint8Array(map.tiles.length), q = [start];
  const ok = (i) => { const t = map.tiles[i]; return t && !t.blocked && !t.environment && !LETHAL_KINDS.has(t.kind) && !/water|pit|void/i.test(String(t.kind)); };
  if (!ok(start)) return []; seen[start] = 1;
  while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * w + nx; if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1 || seen[j] || !ok(j)) continue; seen[j] = 1; q.push(j); } }
  const taken = new Set((map.enemySpawns || []).map((s) => `${Math.round(s.x)},${Math.round(s.y)}`));
  const open = []; for (let i = 0; i < seen.length; i++) if (seen[i]) { const x = i % w, y = (i / w) | 0; if (Math.hypot(x - e.x, y - e.y) >= RULES.wardenMinFromEntry && !taken.has(`${x},${y}`)) open.push({ x, y }); }
  const n = RULES.wardensBySize.find(([size]) => open.length >= size)?.[1] || 0;
  const out = []; let h0 = hashSeed(`${save.seed}:margin-wardens:v1:${dungeonId}`);
  for (let k = 0; k < n * 12 && out.length < n && open.length; k++) {
    h0 = hashSeed(`${h0}:${k}`); const at = open[h0 % open.length];
    if (out.some((o) => Math.hypot(o.x - at.x, o.y - at.y) < RULES.wardenApart)) continue;
    const E = RULES.warden.elites; out.push({ id: `margin-warden-${out.length}`, kind: E[(h0 >>> 8) % E.length], x: at.x, y: at.y, marginWarden: true });
  }
  // Release 473 (Tim: "when you die in a dungeon, the wardens respawn and you get more pages... wardens can only die once"):
  // a warden felled in this crossing never stands again.
  return out.filter((w) => !slain.includes(w.id));
}
// The offer when a warden falls: RULES.offer marginalia, those not yet in the Scrapbook first, by seed.
export function wardenOffer(save, dungeonId, wardenId) {
  const found = new Set(ensureMarginalia(save).found), order = MARGINALIA_IDS.map((id) => [id, hashSeed(`${save.seed}:margin-offer:v1:${dungeonId}:${wardenId}:${id}`)]).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const run = marginRun(save, dungeonId), held = new Set(run?.perks || []);
  return [...order.filter((id) => !found.has(id) && !held.has(id)), ...order.filter((id) => found.has(id) && !held.has(id))].slice(0, RULES.offer);
}
// Release 473 (Tim: "it's disruptive... you have to stop and select the page... just a random buff applies, and there's
// just a notification"): a fallen warden's page is chosen for you, by seed, one not yet in the Scrapbook when there is one.
// It goes into the Scrapbook and works for the rest of this run. Returns the id, or null when every page is already held.
export function wardenPage(save, areaId, wardenId) {
  const run = marginRun(save, areaId); if (!run) return null;
  const id = wardenOffer(save, areaId, wardenId)[0]; if (!id) return null;
  const book = (save.marginalia = ensureMarginalia(save)); if (!book.found.includes(id)) book.found.push(id);
  if (!run.perks.includes(id)) run.perks.push(id); run.offer = null; return id;
}
// Choosing from an offer: into the Scrapbook, and working for the rest of this run.
export function chooseMarginalia(save, areaId, id) {
  const run = marginRun(save, areaId); if (!run?.offer?.includes(id) || !isMarginalia(id)) return { ok: false, message: "That marginalia is not on offer." };
  const book = (save.marginalia = ensureMarginalia(save)), fresh = !book.found.includes(id); if (fresh) book.found.push(id);
  if (!run.perks.includes(id)) run.perks.push(id); run.offer = null;
  return { ok: true, fresh, message: `${MARGINALIA[id].name}: ${MARGINALIA[id].text}${fresh ? " It goes into your Scrapbook." : ""} It holds until you leave this crossing.` };
}
// Pasting one in from the Scrapbook on entering.
export function pasteMarginalia(save, areaId, id) {
  const run = marginRun(save, areaId), book = ensureMarginalia(save);
  if (!run || !book.found.includes(id)) return { ok: false, message: "That page is not in your Scrapbook." };
  if (run.pasted >= RULES.pasteSlots) return { ok: false, message: "You have already pasted a page in for this crossing." };
  if (!run.perks.includes(id)) run.perks.push(id); run.pasted = (run.pasted || 0) + 1;
  return { ok: true, message: `You paste ${MARGINALIA[id].name} into the crossing's margin: ${MARGINALIA[id].text}` };
}
