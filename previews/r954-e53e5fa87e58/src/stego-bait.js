// The Stego Bait (Tim, 2026-11-12). The Wild Stegosaurus's tail, cut off (monster-pack.ts STEGO), falls where it was cut as a
// severed tail lying on the ground (a world pickup, kind "stegoTail"); picking it up gives one "Stego Bait", a stackable
// consumable (save.consumables.stegoBait, as every other supply). Used, it lays the bait on the ground in front of the Wayfarer
// for STEGO.baitSeconds (30 s): every creature in the area that may be lured (stegoBaitLures) attacks only the bait and ignores
// the Wayfarer until it is gone, timed out or eaten (its health, below). game.ts does the wiring (the pickup, the item, the
// lure's worlds, its saving); this module holds the numbers, the save record, the pure rules and the drawings.
//
// It imports only the beast's colours (wild-stego-render.ts imports nothing), so it can never form an import cycle with
// monster-pack.ts, which calls onStegoTailSevered(e, w) once, on the frame the tail comes away.
//
// The save (additive at schema 14, normalised by ensureStegoBait in freshSave and migrateSave): save.stegoBait =
//   { v: 1, drops: [{ id, area, x, y }] (severed tails lying where they fell, at most `drops`; `area` is the game's
//     areaStateId), placed: null | { id, area, x, y, hp, maxHp, left } (the bait on the ground; `left` in seconds) }.
// A placed bait keeps its remaining time on exact resume. It belongs to the area it was laid in: leaving the area ends it.
import { STEGO_ART } from "./wild-stego-render.js?v=r954-e53e5fa87e58";

export const STEGO_BAIT = Object.freeze({
  item: "stegoBait", name: "Stego Bait",
  text: "The Wild Stegosaurus's severed tail, still meaty. Lay it down: every creature that comes near goes for it and leaves you alone until it is gone or eaten.",
  ahead: 1.2, // laid this many tiles in front of the Wayfarer (on the Wayfarer's own spot when that is not open ground)
  health: Object.freeze({ share: 3, min: 90, max: 30000 }), // its health: `share` of the Wayfarer's maximum health when laid, within [min, max]
  biteGap: .25, // seconds: at most one bite lands on it in this time, however many creatures are at it
  scent: 16, // tiles: a creature this near the bait comes for it (aggro), whether or not it had seen anyone
  drops: 6, // severed tails kept lying in the world at once (the oldest goes)
  grab: .7, // tiles: walking this close to a severed tail picks it up (Act on it works too)
  cap: 99, // the most baits carried (as every supply)
  // Never lured: the set-piece fights, tuned to be fought (dungeon bosses and guardians, the Listener and its summons, the
  // Stillworks' finale beasts, the Gloomvast and its decoys, the Mire's heart), and creatures that are not hunting (passing,
  // retreating, practice and grazing beasts). World beasts, the Questing Beast and the Wild Stegosaurus itself are lured.
  ignore: Object.freeze(["farArrayBoss", "farArraySummon", "pentFinaleBeast", "pentBoss", "gloomFinale", "gloomOrbOf", "mireHeart", "buildingGuardian", "keyKeeper", "passingBeast", "retreating", "fleeTo", "passiveBehavior", "ambient", "skyEcho"]),
  ignoreKinds: Object.freeze(["gloomvast", "mothChrysalis"]),
  bossBeasts: Object.freeze(["worldBeast", "questingBeast", "stegoRoom"]), // `boss` creatures that are lured all the same (the roaming beasts)
  // the drawings (standard view; Close View shows them as cards)
  art: Object.freeze({ tailLen: .9, tailWidth: .2, spikes: 4, spikeLen: .26, meat: "#c8455a", meatDark: "#7a1c2c", bone: "#f2ead8", ring: "rgba(255,210,31,.55)", flies: 3 }),
  say: Object.freeze({
    severed: "The tail lies where it fell. Pick it up: it makes Stego Bait.",
    taken: (n) => `You take up the severed tail: one Stego Bait (${n} carried).`,
    full: "You cannot carry any more Stego Bait.",
    laid: (s) => `Stego Bait laid down. For ${s} s every creature here goes for it, not you.`,
    already: "A Stego Bait is already down here.",
    eaten: "The Stego Bait is eaten. They turn back to you.",
    gone: "The Stego Bait is gone. They turn back to you.",
    none: "You have no Stego Bait.",
  }),
});

const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v, lo, hi, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const id = (v) => (typeof v === "string" && v.length > 0 && v.length <= 240 ? v : null);
function normalDrop(d) {
  if (!plain(d) || !id(d.id) || !id(d.area) || !Number.isFinite(Number(d.x)) || !Number.isFinite(Number(d.y))) return null;
  return { ...d, x: num(d.x, -1e6, 1e6), y: num(d.y, -1e6, 1e6) };
}
function normalPlaced(p) {
  if (!plain(p) || !id(p.id) || !id(p.area) || !Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.y))) return null;
  const maxHp = num(p.maxHp, 1, STEGO_BAIT.health.max, STEGO_BAIT.health.min), hp = num(p.hp, 0, maxHp, maxHp), left = num(p.left, 0, 3600, 0);
  if (!(hp > 0) || !(left > 0)) return null;
  return { ...p, x: num(p.x, -1e6, 1e6), y: num(p.y, -1e6, 1e6), hp, maxHp, left };
}
// Normalises save.stegoBait in place (additive: unknown fields kept) and returns it.
export function ensureStegoBait(save) {
  if (!save || typeof save !== "object") return null;
  const raw = plain(save.stegoBait) ? save.stegoBait : {}, drops = [];
  for (const d of Array.isArray(raw.drops) ? raw.drops : []) { const q = normalDrop(d); if (q && !drops.some((o) => o.id === q.id)) drops.push(q); }
  save.stegoBait = { ...raw, v: 1, drops: drops.slice(-STEGO_BAIT.drops), placed: normalPlaced(raw.placed) };
  return save.stegoBait;
}

// --------------------------------------------------------------------------------------------- the tail coming away
// Called by monster-pack.ts once, on the frame the tail is cut: records where the tail fell (e.stegoTailDrop, kept with the
// beast, so a beast drops one tail however often this is called) and asks the world to lay the severed tail down
// (w.dropStegoTail: game.ts packWorld). Deterministic: the drop lies behind the beast, along its heading.
export function onStegoTailSevered(e, w) {
  if (!e || e.stegoTailDrop) return null;
  const h = e.stegoHeading || { x: e.facingX || 1, y: 0 }, m = Math.hypot(h.x, h.y) || 1, back = (Number(e.bodyRadius) || .4) * 1.8;
  const drop = { x: Math.round(((Number(e.x) || 0) - h.x / m * back) * 100) / 100, y: Math.round(((Number(e.y) || 0) - h.y / m * back) * 100) / 100, item: STEGO_BAIT.item, at: Number(w?.now) || 0 };
  e.stegoTailDrop = drop;
  w?.dropStegoTail?.(e, drop);
  return drop;
}
// Records a severed tail lying in `area` (its id unique to the beast). False when that tail is already recorded.
export function recordStegoTail(save, tailId, area, x, y) {
  const S = ensureStegoBait(save); if (!S || !id(tailId) || !id(area) || S.drops.some((d) => d.id === tailId)) return false;
  S.drops.push({ id: tailId, area, x, y }); if (S.drops.length > STEGO_BAIT.drops) S.drops.splice(0, S.drops.length - STEGO_BAIT.drops);
  return true;
}
// The map object a recorded tail lies as.
export const stegoTailObject = (d) => ({ id: d.id, kind: "stegoTail", name: "Severed Stego Tail", x: d.x, y: d.y, state: "lying", actions: ["take"], actionLabels: { take: "Pick up the severed tail" }, lore: STEGO_BAIT.say.severed });
// Takes the recorded tail `tailId`: one bait more. { ok, message, count }.
export function takeStegoTail(save, tailId) {
  const S = ensureStegoBait(save), i = S ? S.drops.findIndex((d) => d.id === tailId) : -1;
  if (i < 0) return { ok: false, message: "Nothing is left here.", count: Number(save?.consumables?.stegoBait) || 0 };
  const c = (save.consumables ||= {}), have = Math.max(0, Math.floor(Number(c[STEGO_BAIT.item]) || 0));
  if (have >= STEGO_BAIT.cap) return { ok: false, message: STEGO_BAIT.say.full, count: have };
  S.drops.splice(i, 1); c[STEGO_BAIT.item] = have + 1;
  return { ok: true, message: STEGO_BAIT.say.taken(have + 1), count: have + 1 };
}

// --------------------------------------------------------------------------------------------- the bait on the ground
// The bait's health for a Wayfarer of `maxHp`.
export const stegoBaitHealth = (maxHp) => Math.round(num((Number(maxHp) || 0) * STEGO_BAIT.health.share, STEGO_BAIT.health.min, STEGO_BAIT.health.max, STEGO_BAIT.health.min));
// Lays one bait from the pack at (x, y) in `area` for `seconds`. { ok, message, placed }.
export function placeStegoBait(save, area, x, y, maxHp, seconds) {
  const S = ensureStegoBait(save), c = (save.consumables ||= {}), have = Math.max(0, Math.floor(Number(c[STEGO_BAIT.item]) || 0));
  if (!(have > 0)) return { ok: false, message: STEGO_BAIT.say.none, placed: null };
  if (S.placed) return { ok: false, message: STEGO_BAIT.say.already, placed: S.placed };
  const hp = stegoBaitHealth(maxHp), left = num(seconds, 1, 3600, 30);
  c[STEGO_BAIT.item] = have - 1;
  S.seq = (Math.max(0, Math.floor(Number(S.seq) || 0)) + 1) % 1e9;
  S.placed = { id: `stego-bait:${S.seq}`, area, x: num(x, -1e6, 1e6), y: num(y, -1e6, 1e6), hp, maxHp: hp, left };
  return { ok: true, message: STEGO_BAIT.say.laid(Math.round(left)), placed: S.placed };
}
// The placed bait when it lies in `area` (null otherwise).
export const stegoBaitIn = (save, area) => { const p = save?.stegoBait?.placed; return p && p.area === area && p.hp > 0 && p.left > 0 ? p : null; };
// Runs the placed bait's clock by `dt` seconds. Returns "eaten", "gone" (timed out) or null (still down, or none).
export function tickStegoBait(save, dt) {
  const S = save?.stegoBait, p = S?.placed; if (!p) return null;
  if (!(p.hp > 0)) { S.placed = null; return "eaten"; }
  p.left = Math.max(0, p.left - Math.max(0, Number(dt) || 0));
  if (!(p.left > 0)) { S.placed = null; return "gone"; }
  return null;
}
// One bite of `amount` on the placed bait at time `t` (seconds of the bait's own clock: its `left`). True when it landed.
export function biteStegoBait(save, amount) {
  const p = save?.stegoBait?.placed; if (!p || !(p.hp > 0) || !(amount > 0)) return false;
  if (Number.isFinite(p.bitAt) && p.bitAt - p.left < STEGO_BAIT.biteGap) return false;
  p.bitAt = p.left; p.hp = Math.max(0, p.hp - Math.max(1, Math.ceil(amount)));
  return true;
}
// Whether a creature can be lured to the bait at all (the boss rule: STEGO_BAIT.ignore).
export function stegoBaitLures(e) {
  if (!e || e.dead || e.isPlayer || e.kind === "npc") return false;
  for (const k of STEGO_BAIT.ignore) if (e[k]) return false;
  if (STEGO_BAIT.ignoreKinds.includes(e.kind)) return false;
  if (e.boss && !STEGO_BAIT.bossBeasts.some((k) => e[k])) return false; // dungeon bosses and guardians, and every other `boss`
  return true;
}

// --------------------------------------------------------------------------------------------- the drawings
// A blue spiked tail, cut: the plated tail as the beast's art paints it, the cut end raw. `o` at tile (x, y), `s` pixels a tile.
export function drawStegoTail(ctx, o, s, now = 0, alpha = 1) {
  const A = STEGO_ART, B = STEGO_BAIT.art, cx = (Number(o.x) + .5) * s, cy = (Number(o.y) + .72) * s, L = B.tailLen * s, W = B.tailWidth * s;
  ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(cx, cy + W * .55, L * .58, W * .55, 0, 0, 7); ctx.fill();
  ctx.translate(cx, cy); ctx.rotate(-.18);
  const x0 = -L / 2, x1 = L / 2; // the cut end at x0, the tip at x1
  ctx.fillStyle = A.body; ctx.strokeStyle = A.outline; ctx.lineWidth = Math.max(1, s * .03);
  ctx.beginPath(); ctx.moveTo(x0, -W * .5); ctx.quadraticCurveTo(0, -W * .62, x1, -W * .08); ctx.lineTo(x1, W * .08); ctx.quadraticCurveTo(0, W * .62, x0, W * .5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = A.bodyDark; ctx.lineWidth = Math.max(1, s * .022); for (let i = 1; i <= 3; i++) { const x = x0 + L * i / 4.2; ctx.beginPath(); ctx.moveTo(x, -W * .4); ctx.lineTo(x + W * .15, W * .1); ctx.stroke(); }
  ctx.fillStyle = A.bodyLight; ctx.beginPath(); ctx.ellipse(0, -W * .18, L * .32, W * .12, 0, 0, 7); ctx.fill();
  for (let i = 0; i < B.spikes; i++) { // the thagomizer: two pairs of spikes near the tip, up and back
    const x = x1 - L * (.12 + (i >> 1) * .18), up = i % 2 ? -1 : 1, len = B.spikeLen * s * (1 - (i >> 1) * .15);
    ctx.fillStyle = A.spike; ctx.strokeStyle = A.spikeBase; ctx.lineWidth = Math.max(1, s * .02);
    ctx.beginPath(); ctx.moveTo(x - W * .16, -W * .2 * up); ctx.lineTo(x + len * .55, -(W * .3 + len) * up); ctx.lineTo(x + W * .16, -W * .1 * up); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = B.meat; ctx.strokeStyle = B.meatDark; ctx.lineWidth = Math.max(1, s * .025); ctx.beginPath(); ctx.ellipse(x0, 0, W * .22, W * .5, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = B.bone; ctx.beginPath(); ctx.arc(x0, 0, W * .12, 0, 7); ctx.fill();
  ctx.restore();
}
// The bait laid down: the tail on a trampled patch, a ring that shrinks as its time runs out and a bar for its health.
export function drawStegoBait(ctx, p, s, now = 0) {
  const B = STEGO_BAIT.art, cx = (Number(p.x) + .5) * s, cy = (Number(p.y) + .72) * s, k = Math.max(0, Math.min(1, (Number(p.hp) || 0) / (Number(p.maxHp) || 1)));
  ctx.save();
  ctx.strokeStyle = B.ring; ctx.lineWidth = Math.max(1.5, s * .05); ctx.setLineDash?.([s * .12, s * .08]);
  ctx.beginPath(); ctx.ellipse(cx, cy + s * .06, s * (.55 + .05 * Math.sin(now / 260)), s * .24, 0, 0, 7); ctx.stroke(); ctx.setLineDash?.([]);
  ctx.restore();
  drawStegoTail(ctx, p, s, now, .55 + .45 * k);
  ctx.save(); ctx.fillStyle = "#1b1410cc"; ctx.fillRect(cx - s * .4, cy - s * .62, s * .8, s * .09);
  ctx.fillStyle = k > .4 ? "#e8c24a" : "#e0563c"; ctx.fillRect(cx - s * .39, cy - s * .61, s * .78 * k, s * .07);
  for (let i = 0; i < B.flies; i++) { const a = now / (420 + i * 90) + i * 2.1; ctx.fillStyle = "#1a1a1acc"; ctx.fillRect(cx + Math.cos(a) * s * .3, cy - s * .3 + Math.sin(a * 1.3) * s * .12, Math.max(1, s * .03), Math.max(1, s * .03)); }
  ctx.restore();
}
