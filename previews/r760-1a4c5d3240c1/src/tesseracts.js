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
// Save (additive, schema 14): save.tesseracts = { owned: [{ uid, kind, grade, name, lines: [{ k, v, bad }], from }], slots:
// [uid|null ×3], seq, got: { <source>: true }, echo: glyphs ever set (once any is) }. Rolls are hashes of the seed and the source, so a source gives its glyph once.
import { hashSeed } from "./random.js?v=r760-1a4c5d3240c1";

export const TESSERACTS = {
  version: 1, slots: 3, keep: 60, dust: 3, // owned at most `keep`; shattering one gives `dust` glyph dust
  // each effect: the range of a bonus, the range of a cost (fractions), and how a line reads
  effects: {
    attackDamage: { good: [.04, .15], bad: [.03, .1], text: "melee damage" },
    spellDamage: { good: [.04, .15], bad: [.03, .1], text: "magic damage" },
    defense: { good: [.02, .08], bad: [.02, .07], text: "damage reduction" },
    hp: { good: [.04, .14], bad: [.03, .1], text: "maximum health" },
    move: { good: [.03, .1], bad: [.03, .08], text: "move speed" },
    attackSpeed: { good: [.03, .12], bad: [.03, .1], text: "attack speed" },
    spellCooldown: { good: [.03, .12], bad: [.03, .1], text: "skill recharge" },
    spellDuration: { good: [.05, .2], bad: [.04, .15], text: "skill duration" },
    staminaRegen: { good: [.05, .25], bad: [.05, .2], text: "stamina recovery" },
    dodgeCost: { good: [.04, .15], bad: [.04, .12], text: "dodge cost", invert: true }, // reads as a cost: −x% good, +x% bad
    burstRadius: { good: [.06, .25], bad: [.05, .2], text: "dodge-burst size" },
    killHeal: { good: [.01, .04], text: "of maximum health back on a kill" }, // a bonus only
    selfHarm: { bad: [.01, .03], text: "of maximum health lost with each swing" }, // a cost only
  },
  kinds: {
    edge: { name: "Edge", sigil: "⟁", color: "#ff7a6a", favour: ["attackDamage", "attackSpeed", "burstRadius", "killHeal"] },
    ward: { name: "Ward", sigil: "⬡", color: "#9fb8d8", favour: ["defense", "hp", "dodgeCost", "killHeal"] },
    gale: { name: "Gale", sigil: "◇", color: "#8fe0b0", favour: ["move", "staminaRegen", "dodgeCost", "attackSpeed"] },
    star: { name: "Star", sigil: "✧", color: "#c9a7ff", favour: ["spellDamage", "spellCooldown", "spellDuration", "burstRadius"] },
    sovereign: { name: "Sovereign", sigil: "⬟", color: "#ffd36a", favour: ["attackDamage", "spellDamage", "defense", "hp", "move", "attackSpeed", "spellCooldown"] },
  },
  // q: how strong its bonuses run (0..1); bad: the chance each of the last two lines is a cost; perFloor: q gained a Heart floor down;
  // costs: the lines that may be a cost (by `bad`), when not the last two (the first line is always a bonus)
  grades: {
    // Tim, 2026-11-05: the completion glyph of the early Pentagons (versions 1 and 2, which pay no other), "heavily skewed toward
    // negative attributes": one bonus and up to three costs (pentagon.ts PENTAGON_COMPLETE)
    hollow: { name: "Hollow", q: .2, bad: .85, costs: [1, 2, 3], kinds: ["edge", "ward", "gale", "star"] },
    labyrinth: { name: "Labyrinth", q: .3, bad: .8, kinds: ["edge", "ward", "gale", "star"] },
    deep: { name: "Deep", q: .45, bad: .6, perFloor: .07, kinds: ["edge", "ward", "gale", "star"] },
    reliquary: { name: "Reliquary", q: .65, bad: .5, kinds: ["edge", "ward", "gale", "star"] },
    regent: { name: "Regent's", q: .75, bad: .45, kinds: ["edge", "ward", "gale", "star"] },
    sealed: { name: "Sealed", q: .85, bad: .3, kinds: ["edge", "ward", "gale", "star"] }, // release 732: the Pentagon's sealed chambers, opened with the Regent's Seal
    sovereign: { name: "Sovereign", q: .95, bad: .2, kinds: ["sovereign"] },
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
const EFFECT_IDS = Object.keys(TESSERACTS.effects);

export function ensureTesseracts(save) {
  const T = save.tesseracts && typeof save.tesseracts === "object" ? save.tesseracts : {}, ok = (g) => g && typeof g.uid === "string" && TESSERACTS.kinds[g.kind] && Array.isArray(g.lines);
  const owned = (Array.isArray(T.owned) ? T.owned : []).filter(ok).map((g) => ({ ...g, lines: g.lines.filter((l) => TESSERACTS.effects[l?.k] && Number.isFinite(l.v)) }));
  const have = new Set(owned.map((g) => g.uid)), slots = Array.from({ length: TESSERACTS.slots }, (_, i) => (have.has(T.slots?.[i]) ? T.slots[i] : null));
  save.tesseracts = { ...T, owned, slots: slots.map((u, i) => (slots.indexOf(u) === i ? u : null)), seq: Math.max(0, Math.floor(Number(T.seq) || 0)), got: T.got && typeof T.got === "object" ? { ...T.got } : {} };
  if (T.echo !== undefined) save.tesseracts.echo = Math.max(0, Math.floor(Number(T.echo) || 0)); // glyphs ever set (TESSERACTS.echoes)
  return save;
}

// Roll the glyph a source gives (pure: the seed and the source decide it). `floor` raises a Deep glyph's grade.
export function rollTesseract(seed, source, gradeId, floor = 0) {
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
// Cut line `i` of glyph `g` again (the Pentagon's dais, pentagon.ts PENTAGON.finale.reroll), by the rules that rolled it: its
// grade's strength (`q`, a Deep glyph's floor unknown, so taken at the grade's own) and cost chance; the first line from its
// kind's favoured effects, the second a bonus, the last two a cost by the grade's `bad` chance; never an effect another line of
// it holds, nor (where another is left) the one it had. Pure: `source` (the Pentagon, the reroll's index, the glyph) decides it.
export function rerollTesseractLine(seed, source, g, i) {
  const G = TESSERACTS.grades[g?.grade] || TESSERACTS.grades.labyrinth, E = TESSERACTS.effects, K = TESSERACTS.kinds[g?.kind] || TESSERACTS.kinds.edge, h = (k) => hashSeed(`${seed}:tesseract-reroll:v1:${source}:${k}`), u = (k) => (h(k) % 10000) / 10000;
  if (!g?.lines?.[i]) return null; const q = G.q, others = new Set(g.lines.filter((_, j) => j !== i).map((l) => l.k)), was = g.lines[i].k;
  const pick = (from) => { const pool = from.filter((id) => !others.has(id)), fresh = pool.filter((id) => id !== was), use = fresh.length ? fresh : pool; return use.length ? use[h("l") % use.length] : null; };
  const good = (id) => { const [a, b] = E[id].good; return { k: id, v: Math.round((a + (b - a) * q * (.6 + .4 * u("v"))) * 1000) / 1000, bad: false }; };
  const bad = (id) => { const [a, b] = E[id].bad; return { k: id, v: Math.round((a + (b - a) * ((1 - q) * .6 + .4 * u("v"))) * 1000) / 1000, bad: true }; };
  const goods = EFFECT_IDS.filter((id) => E[id].good), costs = EFFECT_IDS.filter((id) => E[id].bad);
  if (i === 0) { const id = pick(K.favour.filter((x) => E[x].good)) || pick(goods); return id ? good(id) : null; }
  if ((i === 1 && !(G.costs || []).includes(1)) || u("b") >= G.bad) { const id = pick(goods); return id ? good(id) : null; }
  const id = pick(costs); return id ? bad(id) : null;
}
// Give the glyph a source holds, once ever. Returns it, or null if that source already gave its glyph.
export function grantTesseract(save, source, gradeId, floor = 0, from = "") {
  ensureTesseracts(save); const T = save.tesseracts; if (T.got[source]) return null; T.got[source] = true;
  const g = { uid: `t${++T.seq}`, ...rollTesseract(save.seed, source, gradeId, floor), from };
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
// What the set glyphs add, effect by effect (costs negative; selfHarm positive is the harm).
export function tesseractBonus(save) {
  const out = Object.fromEntries(EFFECT_IDS.map((k) => [k, 0])), T = save?.tesseracts; if (!T?.owned?.length) return out;
  for (const uid of T.slots || []) { const g = uid && T.owned.find((q) => q.uid === uid); if (!g) continue; for (const l of g.lines) out[l.k] += l.k === "selfHarm" ? l.v : l.bad ? -l.v : l.v; }
  return out;
}
export const tesseractLine = (l) => { const E = TESSERACTS.effects[l.k], pct = `${Math.round(l.v * 1000) / 10}%`; return l.k === "selfHarm" ? `${pct} ${E.text}` : l.k === "killHeal" ? `${pct} ${E.text}` : `${l.bad !== !!E.invert ? "−" : "+"}${pct} ${E.text}`; };
