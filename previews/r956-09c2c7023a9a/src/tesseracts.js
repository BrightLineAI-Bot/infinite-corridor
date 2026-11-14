// Tesseract glyphs (release 729; Tim, 2026-11-04: "special glyphs... that you can only get from some of them, and only get some of
// them on deeper floors... the final boss will have better loot if you beat all the champions before you get to him... higher
// quality glyphs or different types... similar to the gems that you get in the Chalice Dungeons... 2 of them can be good, 2 of
// them can be bad... more damage... but your hits do a percentage of damage to you... +3% movement speed but -3% skill
// recharge... if you get it from a labyrinth it'll have a higher chance to have negative effects and lower positive bonuses...
// rare enough... you're gonna have to be hunting for them").
//
// A Tesseract glyph is one of a kind: four lines rolled from EFFECTS, each a bonus or a cost, its two leading lines always bonuses
// (from its kind's favoured effects first) and its last two a cost by its grade's `bad` chance. Grades set how strong the bonuses
// run and how often the costs come: a labyrinth's are the weakest and costliest; the Pentagon's deeper floors better floor by
// floor; its hidden reliquaries better still; the Regent's best, and a Sovereign glyph (all its champions fallen before him) the
// rarest kind, mostly bonuses. Three are set at once (`slots`), in the Glyphs screen. Their lines add to the armor-glyph
// bonuses (glyphs.ts armorGlyphBonus, past its caps, as triads are), so they reach every place those already reach; two lines of
// their own: `killHeal` (health back on a kill) and `selfHarm` (health lost with each swing).
//
// Roll 3 (Tim, 2026-11-05: "the best ones are cursed: they give you good buffs but also have some hard rule... different classes
// of glyphs — some for magic, some for health/defense, some for character buffs (movement speed, stamina), some for melee — so
// you can tune them into your build, and you know what type of cost you're going to have to deal with. The weaker Tesseract
// glyphs should always roll with two negative effects; two versus three should just be random"; "The benefits shouldn't be
// canceled out by the negatives"): every glyph is one of four classes (`classes`: Melee, Magic, Vitality, Motion, on the kinds
// edge, star, ward, gale), its bonuses from its class's pools and its costs from its class's `costs` pool, never on the `axis`
// of one of its own bonuses; a top tier's one cost is a curse from its class's `curse` pool at the effect's full `curse`
// strength, and its three bonuses run past roll 2's by the tier's `lift` (`tiers`). New lines: health back on a melee, magic
// or any hit (capped per second, `hitHealCap`), health lost per cast or per dodge, stamina drained while moving, and more damage
// taken; a health cost never takes you below `harmFloor` of your maximum.
//
// Save (additive, schema 14): save.tesseracts = { owned: [{ uid, kind, grade, name, lines: [{ k, v, bad }], from, roll? }], slots:
// [uid|null ×3], seq, got: { <source>: true }, echo: glyphs ever set (once any is) }. Rolls are hashes of the seed and the source, so a source gives its glyph once.
import { hashSeed } from "./random.js?v=r956-09c2c7023a9a";

export const TESSERACTS = {
  version: 1, slots: 3, keep: 60, dust: 3, // owned at most `keep`; shattering one gives `dust` glyph dust
  // The roll version new glyphs are cut with (grantTesseract). 1: every glyph granted through release 759 (each grade's `bad`
  // chance and `costs`), kept byte for byte. 2: each grade's `cut` (below; releases 762-764). 3: `classes` and `tiers`
  // (below). Every glyph cut at 2 or later records it (`roll`); granted glyphs are kept as stored and never re-rolled; the dais
  // rerolls a line by the rules of the version that cut its glyph.
  roll: 3,
  harmFloor: .15, // a health cost (selfHarm, castHarm, dodgeHarm) stops at this share of maximum health: it never kills
  hitHealCap: .05, // health on hit gives at most this share of maximum health in any one second, however many hits land
  // each effect: the range of a bonus, the range of a cost (fractions), and how a line reads. Roll 3 adds `axis` (a cost never
  // shares one with a bonus on its glyph), `curse` (a top tier's cost, at full strength) and `bad3` (roll 3's cost range where
  // roll 1's would not fit: a swing lands about three times a second on a fast weapon, so roll 3 takes far less health per swing)
  effects: {
    attackDamage: { good: [.04, .15], bad: [.03, .1], axis: "melee", text: "melee damage" },
    spellDamage: { good: [.04, .15], bad: [.03, .1], axis: "magic", text: "magic damage" },
    defense: { good: [.02, .08], bad: [.02, .07], axis: "health", text: "damage reduction" },
    hp: { good: [.04, .14], bad: [.03, .1], axis: "health", text: "maximum health" },
    move: { good: [.03, .1], bad: [.03, .08], curse: [.08, .12], axis: "speed", text: "move speed" },
    attackSpeed: { good: [.03, .12], bad: [.03, .1], curse: [.1, .15], axis: "melee", text: "attack speed" },
    spellCooldown: { good: [.03, .12], bad: [.03, .1], curse: [.15, .25], axis: "magic", text: "skill recharge" },
    spellDuration: { good: [.05, .2], bad: [.04, .15], axis: "magic", text: "skill duration" },
    staminaRegen: { good: [.05, .25], bad: [.05, .2], axis: "stamina", text: "stamina recovery" },
    dodgeCost: { good: [.04, .15], bad: [.04, .12], curse: [.2, .3], axis: "stamina", text: "dodge cost", invert: true }, // reads as a cost: −x% good, +x% bad
    burstRadius: { good: [.06, .25], bad: [.05, .2], axis: "burst", text: "dodge-burst size" },
    killHeal: { good: [.01, .04], plain: true, axis: "health", text: "of maximum health back on a kill" }, // a bonus only
    selfHarm: { bad: [.01, .03], bad3: [.002, .004], curse: [.004, .006], plain: true, harm: true, axis: "health", text: "of maximum health lost with each swing" }, // a cost only
    // Roll 3's own lines (appended; rolls 1 and 2 never draw them). Health on hit (Tim, 2026-11-05: "5% regen on magic hits, 5%
    // regen on melee hits, and another one 2.5% regen on all hits"): a share of maximum health back per landed hit, at most
    // `hitHealCap` of it in a second however many hits land (game.ts tesseractHitHeal); one such line per glyph (`group`).
    meleeHeal: { good: [.01, .038], plain: true, axis: "health", group: "onHit", text: "of maximum health back with each melee hit" },
    spellHeal: { good: [.01, .038], plain: true, axis: "health", group: "onHit", text: "of maximum health back with each magic hit" },
    hitHeal: { good: [.005, .019], plain: true, axis: "health", group: "onHit", text: "of maximum health back with each hit, melee or magic" },
    // Costs only (`harm`: tesseractBonus counts the harm itself, positive). game.ts applies each: castHarm in castSlot / castKey,
    // dodgeHarm on a dodge, staminaDrain in the stamina step while the Wayfarer moves, damageTaken on every blow (hurtScale).
    castHarm: { bad: [.01, .03], curse: [.04, .06], plain: true, harm: true, axis: "health", text: "of maximum health lost with each cast" },
    dodgeHarm: { bad: [.02, .04], curse: [.04, .06], plain: true, harm: true, axis: "health", text: "of maximum health lost with each dodge" },
    staminaDrain: { bad: [.03, .06], curse: [.08, .12], plain: true, harm: true, axis: "stamina", text: "of maximum stamina drained each second you move" },
    damageTaken: { bad: [.05, .12], curse: [.15, .25], harm: true, invert: true, axis: "health", text: "damage taken" }, // reads +x%
  },
  // Roll 3's classes, one per kind (a Sovereign-kind glyph, cut at rolls 1-2, is the old mixed class): `lead` line 0's effects,
  // `bonus` the other bonuses', `costs` its costs below the top tiers, `curse` a top tier's one cost; `boost` a bonus's strength
  // times this (the main damage line higher, a Melee or Magic glyph's secondary health on hit lower); `text` what its costs will
  // be. A cost is never on the `axis` of one of its glyph's own bonuses, so a Melee or Magic glyph holding health on hit takes
  // its cost from the rest of its pool. `healChance`: the share of a class's glyphs whose bonus pool holds its health on hit
  // (a Melee or Magic glyph's is a secondary line; the rest keep their pool's signature curses open).
  classes: {
    edge: { name: "Melee", lead: ["attackDamage", "attackSpeed"], bonus: ["attackDamage", "attackSpeed", "burstRadius", "meleeHeal"], costs: ["selfHarm", "damageTaken", "hp", "staminaDrain", "move"], curse: ["selfHarm", "damageTaken"], curseAlt: ["staminaDrain"], boost: { attackDamage: 1.3, meleeHeal: .3 }, healChance: .3, text: "costs health per swing or more damage taken (stamina or speed when it heals)" },
    star: { name: "Magic", lead: ["spellDamage", "spellCooldown"], bonus: ["spellDamage", "spellCooldown", "spellDuration", "spellHeal"], costs: ["castHarm", "damageTaken", "hp", "attackSpeed", "move"], curse: ["castHarm", "damageTaken"], curseAlt: ["attackSpeed"], boost: { spellDamage: 1.3, spellHeal: .3 }, healChance: .3, text: "costs health per cast or more damage taken (attack or move speed when it heals)" },
    ward: { name: "Vitality", lead: ["hp", "defense", "meleeHeal", "spellHeal", "hitHeal"], bonus: ["defense", "hp", "meleeHeal", "spellHeal", "hitHeal", "killHeal"], costs: ["move", "attackSpeed", "attackDamage", "spellDamage"], curse: ["move", "attackSpeed"], boost: {}, text: "costs move or attack speed, or damage dealt" },
    gale: { name: "Motion", lead: ["move", "staminaRegen", "dodgeCost"], bonus: ["move", "staminaRegen", "dodgeCost", "burstRadius"], costs: ["dodgeHarm", "damageTaken", "hp", "attackDamage"], curse: ["dodgeHarm", "damageTaken"], boost: {}, text: "costs health per dodge or more damage taken" },
  },
  // Roll 3's tiers, by grade: `costs` [min, max] of lines 1-3 that are costs (the count even in the range, its lines even too);
  // `lift` how far bonuses run past roll 2's (times); `curse` true: the one cost is a curse at full `curse` strength, unscaled.
  tiers: {
    hollow: { costs: [2, 3], lift: 1 },
    labyrinth: { costs: [2, 3], lift: 1 },
    deep: { costs: [1, 2], lift: 1 },
    reliquary: { costs: [1, 2], lift: 1 },
    regent: { costs: [1, 2], lift: 1.05 },
    sealed: { costs: [1, 1], lift: 1.2, curse: true },
    sovereign: { costs: [1, 1], lift: 1.35, curse: true },
  },
  kinds: {
    edge: { cls: "Melee", name: "Edge", sigil: "⟁", color: "#ff7a6a", favour: ["attackDamage", "attackSpeed", "burstRadius", "killHeal"] },
    ward: { cls: "Vitality", name: "Ward", sigil: "⬡", color: "#9fb8d8", favour: ["defense", "hp", "dodgeCost", "killHeal"] },
    gale: { cls: "Motion", name: "Gale", sigil: "◇", color: "#8fe0b0", favour: ["move", "staminaRegen", "dodgeCost", "attackSpeed"] },
    star: { cls: "Magic", name: "Star", sigil: "✧", color: "#c9a7ff", favour: ["spellDamage", "spellCooldown", "spellDuration", "burstRadius"] },
    sovereign: { cls: "Sovereign", name: "Sovereign", sigil: "⬟", color: "#ffd36a", favour: ["attackDamage", "spellDamage", "defense", "hp", "move", "attackSpeed", "spellCooldown"] },
  },
  // q: how strong its bonuses run (0..1); bad: the chance each of the last two lines is a cost; perFloor: q gained a Heart floor down;
  // costs: the lines that may be a cost (by `bad`), when not the last two (the first line is always a bonus). `bad` and `costs`
  // cut roll-1 glyphs only.
  // cut (roll 2; Tim, 2026-11-05: "depending on the tier of labyrinth or pentagon you complete, you get different tiers of glyphs
  // that have more or less negative effects. The lower tier tesseracts will roll with at least 2 negative effects, possibly 3.
  // The lower tiers have worse benefits. Higher tiers can roll up to 3 positive effects, and a fourth... it should be
  // negative"): `costs` [min, max], how many of lines 1-3 are costs (line 0 is always a bonus), the count picked evenly in that
  // range per glyph and the lines it falls on picked evenly too; `scale`, how hard a cost bites (its `bad` range times this).
  grades: {
    // Tim, 2026-11-05: the completion glyph of the early Pentagons (versions 1 and 2, which pay no other), "heavily skewed toward
    // negative attributes": one bonus and up to three costs (pentagon.ts PENTAGON_COMPLETE)
    hollow: { name: "Hollow", q: .2, bad: .85, costs: [1, 2, 3], cut: { costs: [2, 3], scale: 1 }, kinds: ["edge", "ward", "gale", "star"] },
    labyrinth: { name: "Labyrinth", q: .3, bad: .8, cut: { costs: [2, 3], scale: .95 }, kinds: ["edge", "ward", "gale", "star"] },
    deep: { name: "Deep", q: .45, bad: .6, perFloor: .07, cut: { costs: [1, 2], scale: .8 }, kinds: ["edge", "ward", "gale", "star"] },
    reliquary: { name: "Reliquary", q: .65, bad: .5, cut: { costs: [1, 2], scale: .7 }, kinds: ["edge", "ward", "gale", "star"] },
    regent: { name: "Regent's", q: .75, bad: .45, cut: { costs: [1, 2], scale: .65 }, kinds: ["edge", "ward", "gale", "star"] },
    sealed: { name: "Sealed", q: .85, bad: .3, cut: { costs: [1, 1], scale: .55 }, kinds: ["edge", "ward", "gale", "star"] }, // release 732: the Pentagon's sealed chambers, opened with the Regent's Seal
    sovereign: { name: "Sovereign", q: .95, bad: .2, cut: { costs: [1, 1], scale: .5 }, kinds: ["sovereign"] },
  },
  // What setting one costs, said once per set and never counted (docs/narrative-bible.md section 1, Tim 2026-11-04: "you're
  // giving part of yourself... You are less you, and you are fading, like the memories, to become more Corridor"). The n-th
  // glyph the Wayfarer ever sets gives echoes[n-1]; past the last, nothing. Flavour only: no line changes a number.
  echoes: [
    "You set it. For a breath you remember a kitchen, a window, someone humming at the sink. Then the humming stops.",
    "You set it. The name of the street you grew up on is on the tip of your tongue, and stays there.",
    "You set it. For a moment your own hand looks like a hand in a drawing.",
    "You set it. There was a song. You are sure there was a song.",
    "You set it. Something is quieter than it was.",
    "You set it. Something you knew is not there now. You do not miss it.",
    "You set it.",
    "…",
  ],
  names: ["of the Fivefold Court", "of the Eyeless Face", "of the Fallen Gate", "of the Under-Heart", "of the Lightless Nave", "of the Drowned Choir", "of the Bone Stair", "of the Long Corridor", "of the Five Faces", "of the Regent's Wake"],
};
// The effects rolls 1 and 2 draw from, fixed (later effects, appended to the table, never join their pools).
const EFFECT_IDS = ["attackDamage", "spellDamage", "defense", "hp", "move", "attackSpeed", "spellCooldown", "spellDuration", "staminaRegen", "dodgeCost", "burstRadius", "killHeal", "selfHarm"];
const ALL_EFFECTS = Object.keys(TESSERACTS.effects);
export const TESSERACT_LINES = ALL_EFFECTS.filter((k) => !EFFECT_IDS.includes(k) || k === "killHeal" || k === "selfHarm"); // lines outside the armor-glyph fields (glyphs.ts passes them through)
export const tesseractClass = (g) => TESSERACTS.classes[g?.kind] || null; // a glyph's roll-3 class (null: the old Sovereign kind)
export const tesseractClassName = (g) => TESSERACTS.kinds[g?.kind]?.cls || "";

export function ensureTesseracts(save) {
  const T = save.tesseracts && typeof save.tesseracts === "object" ? save.tesseracts : {}, ok = (g) => g && typeof g.uid === "string" && TESSERACTS.kinds[g.kind] && Array.isArray(g.lines);
  const owned = (Array.isArray(T.owned) ? T.owned : []).filter(ok).map((g) => ({ ...g, lines: g.lines.filter((l) => TESSERACTS.effects[l?.k] && Number.isFinite(l.v)) }));
  const have = new Set(owned.map((g) => g.uid)), slots = Array.from({ length: TESSERACTS.slots }, (_, i) => (have.has(T.slots?.[i]) ? T.slots[i] : null));
  save.tesseracts = { ...T, owned, slots: slots.map((u, i) => (slots.indexOf(u) === i ? u : null)), seq: Math.max(0, Math.floor(Number(T.seq) || 0)), got: T.got && typeof T.got === "object" ? { ...T.got } : {} };
  if (T.echo !== undefined) save.tesseracts.echo = Math.max(0, Math.floor(Number(T.echo) || 0)); // glyphs ever set (TESSERACTS.echoes)
  return save;
}

// A 32-bit finaliser (avalanche): keys that differ only in their last character (`b1`, `b2`, `b3`) hash far apart. Roll 1's raw
// FNV hashes of such keys moved together (Hollow: two or three costs, almost never one); roll 2 mixes every draw.
const mix32 = (x) => { x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return x >>> 0; };
const CUT_DEFAULT = { costs: [1, 2], scale: 1 };
// A grade's roll-2 cut: { costs: [min, max], scale }.
export const tesseractCut = (gradeId) => (TESSERACTS.grades[gradeId] || TESSERACTS.grades.labyrinth).cut || CUT_DEFAULT;
// Roll the glyph a source gives (pure: the seed and the source decide it). `floor` raises a Deep glyph's grade. `roll` is the
// roll version (TESSERACTS.roll); 1 (the default) is every glyph cut through release 759, byte for byte.
export function rollTesseract(seed, source, gradeId, floor = 0, roll = 1) {
  if (roll >= 3) return rollTesseract3(seed, source, gradeId, floor);
  if (roll >= 2) return rollTesseract2(seed, source, gradeId, floor);
  const G = TESSERACTS.grades[gradeId] || TESSERACTS.grades.labyrinth, E = TESSERACTS.effects, h = (k) => hashSeed(`${seed}:tesseract:v1:${source}:${k}`), u = (k) => (h(k) % 10000) / 10000;
  const q = Math.min(1, G.q + (G.perFloor || 0) * floor), kind = G.kinds[h("kind") % G.kinds.length], K = TESSERACTS.kinds[kind], used = new Set(), lines = [];
  const pick = (from, k) => { const pool = from.filter((id) => !used.has(id)); const id = pool[h(k) % pool.length]; used.add(id); return id; };
  const good = (id, k) => { const [a, b] = E[id].good; return { k: id, v: Math.round((a + (b - a) * q * (.6 + .4 * u(k))) * 1000) / 1000, bad: false }; };
  const bad = (id, k) => { const [a, b] = E[id].bad; return { k: id, v: Math.round((a + (b - a) * ((1 - q) * .6 + .4 * u(k))) * 1000) / 1000, bad: true }; };
  lines.push(good(pick(K.favour.filter((id) => E[id].good), "l0"), "v0"));
  if ((G.costs || []).includes(1) && u("b1") < G.bad) lines.push(bad(pick(EFFECT_IDS.filter((id) => E[id].bad), "l1"), "v1")); // a grade whose second line may be a cost (hollow)
  else lines.push(good(pick(EFFECT_IDS.filter((id) => E[id].good), "l1"), "v1"));
  for (const i of [2, 3]) { const cost = u(`b${i}`) < G.bad; lines.push(cost ? bad(pick(EFFECT_IDS.filter((id) => E[id].bad), `l${i}`), `v${i}`) : good(pick(EFFECT_IDS.filter((id) => E[id].good), `l${i}`), `v${i}`)); }
  return { kind, grade: gradeId, name: `${G.name === K.name ? G.name : `${G.name} ${K.name}`} Tesseract ${TESSERACTS.names[h("name") % TESSERACTS.names.length]}`, lines };
}
// Roll 2: the count of costs picked evenly in the grade's `cut.costs`, then which of lines 1-3 carry them (the lines ranked by
// their own mixed hash, the lowest `n` the costs: every arrangement equally likely). Bonuses run by `q` as at roll 1; a cost's
// strength is roll 1's times `cut.scale`.
const tierLine = (E, q, scale, id, bad, u) => { const [a, b] = E[id][bad ? "bad" : "good"]; return { k: id, v: Math.round((bad ? (a + (b - a) * ((1 - q) * .6 + .4 * u)) * scale : a + (b - a) * q * (.6 + .4 * u)) * 1000) / 1000, bad }; };
function rollTesseract2(seed, source, gradeId, floor) {
  const G = TESSERACTS.grades[gradeId] || TESSERACTS.grades.labyrinth, C = tesseractCut(gradeId), E = TESSERACTS.effects, h = (k) => mix32(hashSeed(`${seed}:tesseract:v2:${source}:${k}`)), u = (k) => (h(k) % 10000) / 10000;
  const q = Math.min(1, G.q + (G.perFloor || 0) * floor), kind = G.kinds[h("kind") % G.kinds.length], K = TESSERACTS.kinds[kind], used = new Set(), lines = [];
  const pick = (from, k) => { const pool = from.filter((id) => !used.has(id)); const id = pool[h(k) % pool.length]; used.add(id); return id; };
  const [lo, hi] = C.costs, n = lo + (h("n") % (hi - lo + 1)), order = [1, 2, 3].sort((a, b) => h(`c${a}`) - h(`c${b}`) || a - b), cost = new Set(order.slice(0, n));
  lines.push(tierLine(E, q, C.scale, pick(K.favour.filter((id) => E[id].good), "l0"), false, u("v0")));
  for (const i of [1, 2, 3]) { const bad = cost.has(i); lines.push(tierLine(E, q, C.scale, pick(EFFECT_IDS.filter((id) => (bad ? E[id].bad : E[id].good)), `l${i}`), bad, u(`v${i}`))); }
  return { kind, grade: gradeId, name: `${G.name === K.name ? G.name : `${G.name} ${K.name}`} Tesseract ${TESSERACTS.names[h("name") % TESSERACTS.names.length]}`, lines };
}
// Roll 3: a class picked evenly from the four (every grade, the Sovereign's too: its kind is its class), the cost count evenly in
// its tier's `costs` and the lines carrying them as at roll 2. Bonuses first: line 0 from the class's `lead`, the rest from its
// `bonus` pool (one health-on-hit line at most); then the costs from its `costs` pool, or at a top tier (`curse`) its `curse`
// pool at the effect's `curse` strength, never on the axis of a bonus the glyph holds.
const CLASS_IDS = Object.keys(TESSERACTS.classes);
export const tesseractTier = (gradeId) => TESSERACTS.tiers[gradeId] || TESSERACTS.tiers.labyrinth;
const classLine = (E, q, T, C, id, bad, u) => { const e = E[id];
  if (bad && T.curse && e.curse) { const [a, b] = e.curse; return { k: id, v: Math.round((a + (b - a) * u) * 1000) / 1000, bad }; }
  const [a, b] = bad ? e.bad3 || e.bad : e.good; return { k: id, v: Math.round((bad ? a + (b - a) * ((1 - q) * .6 + .4 * u) : (a + (b - a) * q * (.6 + .4 * u)) * T.lift * (C.boost[id] || 1)) * 1000) / 1000, bad }; };
// The effects a line of glyph lines `held` may take (pure filter): not one held, not a second health-on-hit, and for a cost not
// on a held bonus's axis (for a bonus, not on a held cost's).
const fitsWith = (E, held, bad) => (id) => !held.some((l) => l.k === id || (E[id].group && E[l.k].group === E[id].group) || (l.bad !== bad && E[l.k].axis === E[id].axis));
// A class's bonus pool for one glyph (or one reroll): with its health on hit only when `x` (a hash in 0..1) falls under `healChance`.
const healless = (C, x) => (C.healChance === undefined || x < C.healChance ? C.bonus : C.bonus.filter((id) => !TESSERACTS.effects[id].group));
// The costs a line may take beside `held`: its class's `costs`, or at a top tier its `curse` pool (`curseAlt` only where every
// curse is on the axis of a bonus the glyph holds: a Melee or Magic glyph that heals on hit).
const costPool = (E, C, T, held) => { const fits = fitsWith(E, held, true); if (!T.curse) return C.costs.filter(fits); const p = C.curse.filter(fits); return p.length ? p : (C.curseAlt || []).filter(fits); };
function rollTesseract3(seed, source, gradeId, floor) {
  const G = TESSERACTS.grades[gradeId] || TESSERACTS.grades.labyrinth, T = tesseractTier(gradeId), E = TESSERACTS.effects, h = (k) => mix32(hashSeed(`${seed}:tesseract:v3:${source}:${k}`)), u = (k) => (h(k) % 10000) / 10000;
  const q = Math.min(1, G.q + (G.perFloor || 0) * floor), kind = CLASS_IDS[h("kind") % CLASS_IDS.length], C = TESSERACTS.classes[kind], lines = [null, null, null, null];
  const [lo, hi] = T.costs, n = lo + (h("n") % (hi - lo + 1)), order = [1, 2, 3].sort((a, b) => h(`c${a}`) - h(`c${b}`) || a - b), cost = new Set(order.slice(0, n));
  const held = () => lines.filter(Boolean), put = (i, pool, bad) => { lines[i] = classLine(E, q, T, C, pool[h(`l${i}`) % pool.length], bad, u(`v${i}`)); };
  put(0, C.lead.filter(fitsWith(E, held(), false)), false); for (const i of [1, 2, 3]) if (!cost.has(i)) put(i, healless(C, u("heal")).filter(fitsWith(E, held(), false)), false);
  for (const i of [1, 2, 3]) if (cost.has(i)) put(i, costPool(E, C, T, held()), true);
  return { kind, grade: gradeId, name: `${G.name} ${C.name} Tesseract ${TESSERACTS.names[h("name") % TESSERACTS.names.length]}`, lines };
}
// Cut line `i` of glyph `g` again (the Pentagon's dais, pentagon.ts PENTAGON.finale.reroll), by the rules that rolled it: its
// grade's strength (`q`, a Deep glyph's floor unknown, so taken at the grade's own) and cost chance; the first line from its
// kind's favoured effects, the second a bonus, the last two a cost by the grade's `bad` chance; never an effect another line of
// it holds, nor (where another is left) the one it had. Pure: `source` (the Pentagon, the reroll's index, the glyph) decides it.
// A glyph cut at roll 2 rerolls by its grade's `cut`: the line comes back a cost or a bonus, evenly where either keeps the glyph's
// cost count inside `cut.costs`, and otherwise whichever does (never below the minimum, never above the maximum). A glyph cut at
// roll 3 does the same inside its tier's `costs`, from its class's pools, never against the axis of another of its lines.
export function rerollTesseractLine(seed, source, g, i) {
  if (!g?.lines?.[i]) return null; if ((Number(g.roll) || 1) >= 3 && TESSERACTS.classes[g.kind]) return rerollTesseractLine3(seed, source, g, i); const two = (Number(g.roll) || 1) >= 2, E = TESSERACTS.effects, K = TESSERACTS.kinds[g?.kind] || TESSERACTS.kinds.edge;
  const G = TESSERACTS.grades[g?.grade] || TESSERACTS.grades.labyrinth, h = two ? (k) => mix32(hashSeed(`${seed}:tesseract-reroll:v2:${source}:${k}`)) : (k) => hashSeed(`${seed}:tesseract-reroll:v1:${source}:${k}`), u = (k) => (h(k) % 10000) / 10000;
  const q = G.q, others = new Set(g.lines.filter((_, j) => j !== i).map((l) => l.k)), was = g.lines[i].k;
  const pick = (from) => { const pool = from.filter((id) => !others.has(id)), fresh = pool.filter((id) => id !== was), use = fresh.length ? fresh : pool; return use.length ? use[h("l") % use.length] : null; };
  const goods = EFFECT_IDS.filter((id) => E[id].good), costs = EFFECT_IDS.filter((id) => E[id].bad);
  if (two) { const C = tesseractCut(g.grade), [lo, hi] = C.costs, rest = g.lines.filter((l, j) => j !== i && l.bad).length;
    const mayCost = i > 0 && rest + 1 <= hi, mayBonus = i === 0 || rest >= lo, bad = mayCost && (!mayBonus || u("b") < .5);
    const id = bad ? pick(costs) : (i === 0 && pick(K.favour.filter((x) => E[x].good))) || pick(goods); return id ? tierLine(E, q, C.scale, id, bad, u("v")) : null; }
  const good = (id) => { const [a, b] = E[id].good; return { k: id, v: Math.round((a + (b - a) * q * (.6 + .4 * u("v"))) * 1000) / 1000, bad: false }; };
  const bad = (id) => { const [a, b] = E[id].bad; return { k: id, v: Math.round((a + (b - a) * ((1 - q) * .6 + .4 * u("v"))) * 1000) / 1000, bad: true }; };
  if (i === 0) { const id = pick(K.favour.filter((x) => E[x].good)) || pick(goods); return id ? good(id) : null; }
  if ((i === 1 && !(G.costs || []).includes(1)) || u("b") >= G.bad) { const id = pick(goods); return id ? good(id) : null; }
  const id = pick(costs); return id ? bad(id) : null;
}
function rerollTesseractLine3(seed, source, g, i) {
  const E = TESSERACTS.effects, C = TESSERACTS.classes[g.kind], T = tesseractTier(g.grade), q = (TESSERACTS.grades[g.grade] || TESSERACTS.grades.labyrinth).q;
  const h = (k) => mix32(hashSeed(`${seed}:tesseract-reroll:v3:${source}:${k}`)), u = (k) => (h(k) % 10000) / 10000;
  const held = g.lines.filter((_, j) => j !== i && E[g.lines[j]?.k]), was = g.lines[i].k, [lo, hi] = T.costs, rest = held.filter((l) => l.bad).length;
  const pool = (bad) => (bad ? costPool(E, C, T, held) : (i === 0 ? C.lead : healless(C, u("heal"))).filter(fitsWith(E, held, false)));
  const mayCost = i > 0 && rest + 1 <= hi && pool(true).length > 0, mayBonus = (i === 0 || rest >= lo) && pool(false).length > 0, bad = mayCost && (!mayBonus || u("b") < .5);
  if (!mayCost && !mayBonus) return null; const p = pool(bad), fresh = p.filter((id) => id !== was), use = fresh.length ? fresh : p;
  return classLine(E, q, T, C, use[h("l") % use.length], bad, u("v"));
}
// Give the glyph a source holds, once ever. Returns it, or null if that source already gave its glyph.
export function grantTesseract(save, source, gradeId, floor = 0, from = "") {
  ensureTesseracts(save); const T = save.tesseracts; if (T.got[source]) return null; T.got[source] = true;
  const roll = TESSERACTS.roll, g = { uid: `t${++T.seq}`, ...rollTesseract(save.seed, source, gradeId, floor, roll), from }; if (roll >= 2) g.roll = roll; // the version that cut it (its dais rerolls follow it)
  T.owned.push(g); while (T.owned.length > TESSERACTS.keep) { const i = T.owned.findIndex((q) => !T.slots.includes(q.uid)); if (i < 0) break; T.owned.splice(i, 1); }
  return g;
}
// The line for the n-th glyph ever set (1-based), or null past the last.
export const tesseractEcho = (n) => TESSERACTS.echoes[Math.floor(n) - 1] || null;
export function setTesseract(save, slot, uid) {
  ensureTesseracts(save); const T = save.tesseracts; if (slot < 0 || slot >= TESSERACTS.slots) return { ok: false, message: "No such slot." };
  if (uid && !T.owned.some((g) => g.uid === uid)) return { ok: false, message: "You do not have that glyph." };
  const fresh = !!uid && !T.slots.includes(uid); // set now, not moved from another slot
  for (let i = 0; i < T.slots.length; i++) if (uid && T.slots[i] === uid) T.slots[i] = null; // one glyph, one slot
  T.slots[slot] = uid || null; const g = T.owned.find((q) => q.uid === uid);
  const echo = fresh ? tesseractEcho((T.echo = (Number(T.echo) || 0) + 1)) : null;
  return { ok: true, echo, message: g ? (echo ? `${g.name}. ${echo}` : `${g.name} set.`) : "Slot cleared." };
}
export function shatterTesseract(save, uid) {
  ensureTesseracts(save); const T = save.tesseracts, i = T.owned.findIndex((g) => g.uid === uid); if (i < 0) return { ok: false, message: "You do not have that glyph." };
  const [g] = T.owned.splice(i, 1); T.slots = T.slots.map((u) => (u === uid ? null : u)); save.glyphDust = (Number(save.glyphDust) || 0) + TESSERACTS.dust;
  return { ok: true, message: `${g.name} shatters into ${TESSERACTS.dust} glyph dust.` };
}
// What the set glyphs add, effect by effect (costs negative; a `harm` cost, selfHarm, castHarm, dodgeHarm, staminaDrain,
// damageTaken, positive: the harm).
export function tesseractBonus(save) {
  const out = Object.fromEntries(ALL_EFFECTS.map((k) => [k, 0])), T = save?.tesseracts; if (!T?.owned?.length) return out;
  for (const uid of T.slots || []) { const g = uid && T.owned.find((q) => q.uid === uid); if (!g) continue; for (const l of g.lines) out[l.k] += TESSERACTS.effects[l.k].harm ? l.v : l.bad ? -l.v : l.v; }
  return out;
}
export const tesseractLine = (l) => { const E = TESSERACTS.effects[l.k], pct = `${Math.round(l.v * 1000) / 10}%`; return E.plain ? `${pct} ${E.text}` : `${l.bad !== !!E.invert ? "−" : "+"}${pct} ${E.text}`; };
// What a glyph's class reads as (the Glyphs screen): "Melee · costs health per swing or more damage taken..."; a glyph cut before
// roll 3 drew its costs from every effect, so only its class name shows.
export const tesseractClassText = (g) => { const C = (Number(g?.roll) || 1) >= 3 ? tesseractClass(g) : null; return C ? `${C.name} · ${C.text}` : tesseractClassName(g); };
