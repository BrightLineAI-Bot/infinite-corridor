// The Triceratops hatchling (Tim, 2026-11-19): a hurt, sick mama Triceratops at the Beast Hotel asks the Wayfarer to save her babies.
// The rescue site is marked on the Atlas and the compass, a few sections from the hometown. A pack of creatures guards a pen there,
// and freeing the hatchling makes him the Wayfarer's companion. He grows from a share of the experience the Wayfarer earns from fights
// while he is out. He has three forms:
//   baby  (a little smaller than the Wayfarer; support): light buffs (one of each kind at most, refreshed, never doubled), a good heal now and
//         then, a chill that slows or freezes nearby foes, and barely any damage;
//   young (about the Stalker's cat form; damage): a charged three-beam horn blast, gatling horns, a tail whirl, a bite, a charge and forefoot stomps, and he
//         walks with and around the Wayfarer and picks fights with nearby foes;
//   big   the rideable Triceratops (beast-mounts.ts: the normal persistent mount, release 1006 body, 1002 controls).
// Once a form is unlocked it stays unlocked. The Pack chooses which form a hold of Act (MOUNT_RIDE.callHold) calls.
// Tim, 2026-11-19 (second decision): the free Triceratops (release 734's production grant) is taken away from every journey, and every
// journey gets this quest. Caught Triceratops (Good and Silly) and every other mount stay as they are.
//
// Pure data and rules. game.ts runs the companion (tickHatchling), main.ts the Pack row and the Atlas, renderer and Close View draw him.
// State: save.mounts.hatchling (additive at schema 14; normalised by ensureHatchling, which beast-mounts.ts ensureMounts calls).
import { hashSeed } from "./random.js?v=r1026-6231c3f70783";

const f = Object.freeze;
export const HATCHLING = f({
  version: 1,
  // The rescue. `band`: Chebyshev sections from the hometown the site may be in; `loads`: at most this many sections previewed for
  // reachable ground (in the hashed order); `guards`: the pack round the pen, drawn from `guardKinds` by the seed; `ring`: tiles from
  // the pen they stand; `penFree`: tiles from the pen the Wayfarer must be to free him.
  quest: f({ version: 1, band: f([3, 5]), loads: 12, guards: 3, guardKinds: f(["ashenHound", "coilStalker", "ashling", "rootBrute"]), ring: 2.4, penFree: 1.8,
    names: f({ mama: "Mother Triceratops", pen: "Hatchling pen", quest: "Save the hatchling" }),
    messages: f({
      offer: "The mother Triceratops lifts her head from the straw. \"My babies... the pack took one of them. Please. Bring my little one home.\" The place is marked on your Atlas and compass.",
      already: "The mother Triceratops watches the door. \"Have you found my baby?\"",
      thanks: "The mother Triceratops rumbles softly. \"He chose you. Look after him.\"",
      arrive: "A small frightened bleat from a pen of lashed branches: a Triceratops hatchling, and the pack that took him.",
      guarded: "The pack still guards the pen. Drive them off first.",
      freed: "You pull the pen open. The hatchling bumps his nub of a horn against your leg and will not leave your side: he is your companion now.",
    }) }),
  // Growth: `share` of the experience the Wayfarer earns from fights while he is out (elites and world beasts already give more);
  // `young` / `big`: the companion experience each form unlocks at (cumulative). Tuned for about 3 hours of play from baby to young
  // and about 4 more to big at ordinary kill rates (about 1,800 Wayfarer experience an hour in the mid game).
  growth: f({ share: .5, young: 2700, big: 6300 }),
  // `scale`: the standard view's; `closeViewScale`: Close View's body (Tim, 2026-11-19 size pass: the baby a little shorter than the
  // Wayfarer in both views, the young about the Stalker's cat form; presentation only).
  forms: f({
    baby: f({ name: "Baby", scale: .74, closeViewScale: 1.2, speed: 3.1, rideable: false, text: "support: light buffs, heals and a chill" }),
    young: f({ name: "Young", scale: 1, closeViewScale: 1.2, speed: 3.6, rideable: false, text: "damage: horn beams, gatling horns, tail whirl, bite and charge" }),
    big: f({ name: "Big", scale: 2.1, speed: 0, rideable: true, text: "rideable" }),
  }),
  formIds: f(["baby", "young", "big"]),
  // Following: he keeps about `near` tiles off, behind the Wayfarer; farther than `far` (or in another place) he catches up at once.
  follow: f({ near: 1.3, far: 12, back: 1.1 }),
  // The baby's buffs: one kind at a time is given every `every` seconds, for `seconds`; kinds stack, never two of a kind (a repeat
  // refreshes its time). Bonus fields are the meal fields game.ts armorGlyphBonus already applies (fractions), plus damageTaken (hurtScale's multiplier).
  buffs: f({ every: 10, seconds: 40, kinds: f({
    damage: f({ name: "damage", bonus: f({ attackDamage: .02, spellDamage: .02 }) }),
    defence: f({ name: "defence", bonus: f({ damageTaken: -.1 }) }), // 10% less damage taken (game.ts hurtScale: a flat multiplier, not the capped reduction curve)
    stamina: f({ name: "stamina recovery", bonus: f({ staminaRegen: .05 }) }),
  }) }),
  baby: f({
    heal: f({ every: 16, share: .22, below: .85 }), // a share of maximum health, when the Wayfarer is under `below` of it
    chill: f({ every: 11, radius: 3.6, slow: .5, slowMs: 3000, freeze: 1.1, freezeMax: 2, bossShare: .25 }), // nearby foes slowed; the nearest `freezeMax` frozen (hitStun)
    nip: f({ every: 1.6, range: 1.3, share: .05, radius: .55 }), // barely any damage: a share of the Wayfarer's melee power
  }),
  young: f({
    aggro: 6.5, // he picks fights with foes this near the Wayfarer
    orbit: f({ radius: 1.9, rate: .55 }), // walking with and round the Wayfarer when there is no fight
    // Moves, in his order of preference. range: [min, max] tiles to the foe; cd: seconds; share: of the Wayfarer's melee power per hit.
    moves: f({
      beam: f({ range: f([2.5, 7]), cd: 9, charge: .9, share: 1.6, length: 7, step: .7, radius: .55 }),
      gatling: f({ range: f([2, 6]), cd: 6, shots: 6, gap: .12, share: .28, radius: .45 }),
      charge: f({ range: f([2.2, 5]), cd: 7, speed: 7, time: .55, share: .8, radius: .9, stun: .3 }),
      whirl: f({ range: f([0, 1.8]), cd: 5, pulses: 2, gap: .25, share: .6, radius: 1.7 }),
      stomp: f({ range: f([0, 1.4]), cd: 3.2, hits: 2, gap: .22, share: .5, radius: .8 }),
      bite: f({ range: f([0, 1.3]), cd: 1.8, share: .7, radius: .6 }),
    }),
  }),
  // Bounds: live companion effects (they share the Wayfarer's effects list) and drawn-only visuals.
  maxEffects: 6, maxVisuals: 10,
});
export const HATCH_MOVE_IDS = Object.freeze(Object.keys(HATCHLING.young.moves));
export const HATCH_BUFF_IDS = Object.freeze(Object.keys(HATCHLING.buffs.kinds));
const QUEST_STATES = new Set(["none", "active", "rescued"]);
const num = (v, lo, hi, d) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : d;
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// save.mounts.hatchling = { v, quest: { state, from, rx, ry, x?, y?, guards: [id], cleared: [id] }, owned, xp, form, out, buffs }
// out (while he is out) = { area, x, y, face, seq, timers: { buff, heal, chill, nip }, cd: { move: s }, act: { kind, left, ... } | null }
// Timers are seconds left (ticked by play time only, so a pause or a reload resumes them exactly). Unknown fields are kept.
export function ensureHatchling(mounts) {
  const h = isObj(mounts.hatchling) ? mounts.hatchling : (mounts.hatchling = {});
  h.v = 1;
  const q = isObj(h.quest) ? h.quest : (h.quest = {});
  q.state = QUEST_STATES.has(q.state) ? q.state : "none";
  if (q.state !== "none" && !(Number.isSafeInteger(q.rx) && Number.isSafeInteger(q.ry))) q.state = h.owned === true ? "rescued" : "none";
  q.guards = (Array.isArray(q.guards) ? q.guards : []).filter((k) => typeof k === "string").slice(0, HATCHLING.quest.guards);
  q.cleared = (Array.isArray(q.cleared) ? q.cleared : []).filter((k, i, a) => typeof k === "string" && a.indexOf(k) === i).slice(0, HATCHLING.quest.guards);
  h.owned = h.owned === true || q.state === "rescued";
  if (h.owned) q.state = "rescued";
  h.xp = Math.max(0, Math.floor(Number(h.xp) || 0));
  h.form = HATCHLING.formIds.includes(h.form) && formUnlocked(h, h.form) ? h.form : "baby";
  const b = isObj(h.buffs) ? h.buffs : {}; h.buffs = {};
  for (const k of HATCH_BUFF_IDS) { const s = num(b[k], 0, HATCHLING.buffs.seconds, 0); if (s > 0) h.buffs[k] = s; }
  for (const [k, v] of Object.entries(b)) if (!HATCH_BUFF_IDS.includes(k)) h.buffs[k] = v; // unknown kinds kept, never applied
  h.out = h.owned && h.form !== "big" ? cleanOut(h.out) : null;
  return h;
}
function cleanOut(o) {
  if (!isObj(o) || typeof o.area !== "string" || !Number.isFinite(o.x) || !Number.isFinite(o.y)) return null;
  const t = isObj(o.timers) ? o.timers : {}, cd = isObj(o.cd) ? o.cd : {};
  o.face = o.face < 0 ? -1 : 1; o.seq = Math.max(0, Math.floor(Number(o.seq) || 0));
  o.timers = { buff: num(t.buff, 0, HATCHLING.buffs.every, 0), heal: num(t.heal, 0, HATCHLING.baby.heal.every, HATCHLING.baby.heal.every), chill: num(t.chill, 0, HATCHLING.baby.chill.every, HATCHLING.baby.chill.every), nip: num(t.nip, 0, HATCHLING.baby.nip.every, 0) };
  o.cd = {}; for (const k of HATCH_MOVE_IDS) { const s = num(cd[k], 0, HATCHLING.young.moves[k].cd, 0); if (s > 0) o.cd[k] = s; }
  o.act = cleanAct(o.act);
  return o;
}
function cleanAct(a) {
  if (!isObj(a) || !HATCH_MOVE_IDS.includes(a.kind) || !(Number(a.left) > 0)) return null;
  const M = HATCHLING.young.moves[a.kind];
  a.left = Math.min(Number(a.left), 5); a.n = Math.max(0, Math.min(8, Math.floor(Number(a.n) || 0)));
  for (const k of ["x", "y"]) if (!(Number.isFinite(a[k]) && Math.abs(a[k]) <= 1.0001)) { a.x = 1; a.y = 0; break; }
  a.target = typeof a.target === "string" ? a.target : null; a.phase = typeof a.phase === "string" ? a.phase : "go";
  void M; return a;
}

// ---------------------------------------------------------------- growth and forms
export const formUnlocked = (h, form) => !!h?.owned && (form === "baby" || form === "young" && h.xp >= HATCHLING.growth.young || form === "big" && h.xp >= HATCHLING.growth.big);
export const unlockedForms = (h) => HATCHLING.formIds.filter((k) => formUnlocked(h, k));
export function hatchlingStage(h) { return formUnlocked(h, "big") ? "big" : formUnlocked(h, "young") ? "young" : "baby"; }
// The companion experience a fight's `amount` of Wayfarer experience gives (while he is out). Returns the forms newly unlocked.
export function feedHatchling(h, amount) {
  if (!h?.owned || !(amount > 0)) return [];
  const before = unlockedForms(h); h.xp = Math.max(0, Math.floor(h.xp + Math.max(0, Math.floor(amount * HATCHLING.growth.share))));
  return unlockedForms(h).filter((k) => !before.includes(k));
}
// Progress toward the next form: { next, have, need } (next null when grown).
export function growthProgress(h) {
  const G = HATCHLING.growth, xp = Math.max(0, Number(h?.xp) || 0);
  if (xp >= G.big) return { next: null, have: xp, need: G.big };
  return xp >= G.young ? { next: "big", have: xp - G.young, need: G.big - G.young } : { next: "young", have: xp, need: G.young };
}
export function chooseForm(h, form) {
  if (!formUnlocked(h, form)) return false;
  h.form = form; if (form === "big") h.out = null; return true;
}

// ---------------------------------------------------------------- the baby's buffs
// Which kind the buff timer gives next: the kinds in a hashed order each round (every kind once a round, random-ish), a round never
// starting with the kind the last one ended on, so no kind comes twice in a row.
function buffRound(seed, r) { // round r: its last kind from a hash, its first never the last of round r - 1, the rest in a hashed order
  const n = HATCH_BUFF_IDS.length, last = (k) => HATCH_BUFF_IDS[hashSeed(`${seed}:hatchling-buff:v1:${k}:end`) % n], L = last(r), P = r > 0 ? last(r - 1) : null;
  const rest = HATCH_BUFF_IDS.filter((k) => k !== L), firsts = rest.filter((k) => k !== P), F = firsts[hashSeed(`${seed}:hatchling-buff:v1:${r}:first`) % firsts.length];
  const mid = rest.filter((k) => k !== F);
  for (let i = mid.length - 1; i > 0; i--) { const j = hashSeed(`${seed}:hatchling-buff:v1:${r}:${i}`) % (i + 1), t = mid[i]; mid[i] = mid[j]; mid[j] = t; }
  return [F, ...mid, L];
}
export function nextBuffKind(seed, seq) {
  const n = HATCH_BUFF_IDS.length, q = Math.max(0, Math.floor(seq) || 0);
  return buffRound(seed, Math.floor(q / n))[q % n];
}
// Gives (or refreshes) one buff: never a second of the same kind.
export function grantBuff(h, kind, seconds = HATCHLING.buffs.seconds) {
  if (!HATCH_BUFF_IDS.includes(kind)) return false;
  h.buffs ||= {}; const had = h.buffs[kind] > 0; h.buffs[kind] = seconds; return !had;
}
export function tickBuffs(h, dt) {
  const b = h?.buffs; if (!b || !(dt > 0)) return;
  for (const k of HATCH_BUFF_IDS) if (b[k] > 0) { b[k] = Math.max(0, b[k] - dt); if (!(b[k] > 0)) delete b[k]; }
}
export function clearBuffs(h) { if (h?.buffs) for (const k of HATCH_BUFF_IDS) delete h.buffs[k]; }
// The summed bonus of the buffs in effect (meal fields), or null with none. Allocates only while a buff is up.
export function hatchlingBonus(save) {
  const b = save?.mounts?.hatchling?.buffs; if (!b) return null;
  let out = null;
  for (const k of HATCH_BUFF_IDS) if (b[k] > 0) { out ||= {}; for (const [f2, v] of Object.entries(HATCHLING.buffs.kinds[k].bonus)) out[f2] = (out[f2] || 0) + v; }
  return out;
}

// ---------------------------------------------------------------- the rescue site
// The sections the site may be in, in its hashed order (version-pinned: the same seed, hometown and version give the same list).
export function rescueCandidates(seed, from, version = HATCHLING.quest.version) {
  const [lo, hi] = HATCHLING.quest.band, out = [], [fx, fy] = String(from).split(",").map(Number);
  for (let dy = -hi; dy <= hi; dy++) for (let dx = -hi; dx <= hi; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < lo) continue;
    const rx = fx + dx, ry = fy + dy; out.push({ rx, ry, k: hashSeed(`${seed}:hatchling-rescue:v${version}:${from}:${rx},${ry}`) });
  }
  return out.sort((a, b) => a.k - b.k || a.ry - b.ry || a.rx - b.rx).map(({ rx, ry }) => ({ rx, ry }));
}
// The site: the first candidate whose previewed ground `ok(rx, ry)` can hold the pen (at most `loads` looked at); else the first.
export function chooseRescueSite(seed, from, ok, version = HATCHLING.quest.version) {
  const list = rescueCandidates(seed, from, version).slice(0, HATCHLING.quest.loads);
  return list.find((c) => ok(c.rx, c.ry)) || list[0];
}
export const guardKind = (seed, i, version = HATCHLING.quest.version) => HATCHLING.quest.guardKinds[hashSeed(`${seed}:hatchling-guard:v${version}:${i}`) % HATCHLING.quest.guardKinds.length];
export const guardId = (i) => `hatchling-guard:v1:${i}`;
export const questOpen = (h) => !!h && !h.owned;
// The live quest, for the Atlas and the compass: { rx, ry, x?, y?, name } or null.
export function rescueGuidance(h) {
  const q = h?.quest; if (!q || q.state !== "active" || h.owned) return null;
  return { area: "overworld", rx: q.rx, ry: q.ry, ...(Number.isInteger(q.x) ? { x: q.x, y: q.y } : {}), kind: "guidance", name: HATCHLING.quest.names.quest };
}

// ---------------------------------------------------------------- the young form's choice of move
// The move he makes at `d` tiles from his foe: the first in his order whose range holds and whose cooldown is spent; ties of the
// near moves (bite, stomp, whirl) are broken by a hash of his sequence so the fight does not read as a loop. Null: walk closer.
export function pickMove(out, d, seed = "") {
  const ready = [];
  for (const k of HATCH_MOVE_IDS) { const M = HATCHLING.young.moves[k]; if (d >= M.range[0] && d <= M.range[1] && !(out.cd?.[k] > 0)) ready.push(k); }
  if (!ready.length) return null;
  const far = ready.filter((k) => HATCHLING.young.moves[k].range[0] > 0); if (far.length) return far[0];
  return ready[hashSeed(`${seed}:hatchling-move:v1:${out.seq || 0}`) % ready.length];
}
// The seconds a move's act lasts from its start (its windup, shots or travel).
export function moveTime(kind) {
  const M = HATCHLING.young.moves[kind];
  return kind === "beam" ? M.charge + .25 : kind === "gatling" ? M.shots * M.gap + .05 : kind === "charge" ? M.time : kind === "whirl" ? M.pulses * M.gap + .05 : kind === "stomp" ? M.hits * M.gap + .05 : .3;
}
