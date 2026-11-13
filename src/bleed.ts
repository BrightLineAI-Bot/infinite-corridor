// Bleed (Tim, 2026-11-12; modelled on a bleeding hunt beast's wounds): the Spinosaurus's slashes and bites open a wound that bleeds
// only while the Wayfarer moves. Its own status, not poison: it has its own dark-red icon, its own numbers (BLEED) and its own save
// record (save.bleed, additive at schema 14, normalised by ensureBleed in freshSave and migrateSave).
//
// - It lasts BLEED.seconds. A new bleed while bleeding sets the time back to the full BLEED.seconds; it never stacks.
// - Each frame the Wayfarer moves (walks, dodges, attacks) adds BLEED.totalShare / BLEED.seconds of their maximum health a second to
//   what the wound owes; the owed health is taken in whole points every BLEED.tick seconds. So a Wayfarer who never stops loses about
//   BLEED.totalShare of their maximum health over the whole bleed; one who stands still loses nothing.
// - Standing still BLEED.stillSeconds without a break cures it (save.bleed.still is that count; moving sets it back to 0). Potions and
//   every other heal leave it alone: only stillness and time end it.
// - A creature (only the Wild Stegosaurus, monster-pack.ts) simply bleeds its minute: BLEED.totalShare of its health, evenly.
// Pure: no DOM, no randomness. The drawing helper takes a canvas context and draws nothing that moves under reduced motion.
export const BLEED = {
  seconds: 60, /* how long a bleed lasts (refreshed, never stacked) */
  totalShare: .2, /* of maximum health, lost over the full bleed by a Wayfarer who never stops moving */
  tick: 1, /* seconds between the moments the owed health is taken */
  stillSeconds: 4, /* standing still this long, unbroken, cures it */
  icon: { color: "#7a0f16", rim: "#c2303a", ring: "#f0d6d0", track: "rgba(40,6,8,.55)", size: .34, lift: 1.55 },
  text: { start: "You are bleeding! Stand still to stop it.", cured: "The bleeding stops." },
};
const fresh = () => ({ left: 0, still: 0, tick: 0, owed: 0 });
const num = (v, lo = 0, hi = Infinity) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
// The save's bleed record, normalised in place (unknown fields kept).
export function ensureBleed(save) {
  if (!save || typeof save !== "object") return fresh();
  const old = save.bleed && typeof save.bleed === "object" && !Array.isArray(save.bleed) ? save.bleed : {};
  save.bleed = { ...old, left: num(old.left, 0, BLEED.seconds), still: num(old.still, 0, BLEED.stillSeconds), tick: num(old.tick, 0, BLEED.tick), owed: num(old.owed, 0, 1e6) };
  if (!(save.bleed.left > 0)) Object.assign(save.bleed, fresh());
  return save.bleed;
}
const record = (save) => { const b = save?.bleed; return b && typeof b === "object" && Number.isFinite(b.left) && Number.isFinite(b.still) && Number.isFinite(b.tick) && Number.isFinite(b.owed) ? b : ensureBleed(save); };
export const bleeding = (save) => (Number(save?.bleed?.left) || 0) > 0;
// A landed slash or bite: the wound opens, or its time is set back to the full minute (never stacked). True when it newly started.
export function applyBleed(save) {
  const b = record(save), was = b.left > 0;
  b.left = BLEED.seconds; b.still = 0; if (!was) { b.tick = BLEED.tick; b.owed = 0; }
  return !was;
}
export function clearBleed(save) { if (save && typeof save === "object") save.bleed = fresh(); }
// One frame of bleeding. `moving`: the Wayfarer walked, dodged or struck this frame. Returns { damage, cured } (damage in whole points,
// taken now; cured when a still spell ended it this frame).
export function tickBleed(save, dt, moving, maxHp) {
  const b = record(save); if (!(b.left > 0) || !(dt > 0)) return { damage: 0, cured: false };
  const step = Math.min(dt, b.left);
  if (moving) { b.still = 0; b.owed += (Number(maxHp) || 0) * BLEED.totalShare / BLEED.seconds * step; }
  else { b.still = Math.min(BLEED.stillSeconds, b.still + dt); if (b.still >= BLEED.stillSeconds) { Object.assign(b, fresh()); return { damage: 0, cured: true }; } }
  b.left = Math.max(0, b.left - dt); b.tick -= dt;
  let damage = 0;
  if (b.tick <= 0 || !(b.left > 0)) { damage = Math.floor(b.owed + 1e-9); b.owed -= damage; b.tick += BLEED.tick; if (b.tick <= 0) b.tick = BLEED.tick; }
  if (!(b.left > 0)) { damage += Math.round(b.owed); Object.assign(b, fresh()); }
  return { damage, cured: false };
}
// How far the still cure has come, 0..1 (the icon's ring).
export const bleedStillShare = (save) => bleeding(save) ? Math.max(0, Math.min(1, (Number(save.bleed.still) || 0) / BLEED.stillSeconds)) : 0;
// A creature's bleed (the Wild Stegosaurus): `e.spinoBleed` seconds left, `e.spinoBleedOwed` health owed. Returns the whole points of
// health to take this frame (the caller takes them, so a beast's floor and death stay the game's business).
export function tickCreatureBleed(e, dt) {
  if (!(e?.spinoBleed > 0) || !(dt > 0)) return 0;
  const step = Math.min(dt, e.spinoBleed);
  e.spinoBleedOwed = (Number(e.spinoBleedOwed) || 0) + (Number(e.maxHp) || 0) * BLEED.totalShare / BLEED.seconds * step;
  e.spinoBleed = Math.max(0, e.spinoBleed - dt);
  e.spinoBleedTick = (Number.isFinite(e.spinoBleedTick) ? e.spinoBleedTick : BLEED.tick) - dt;
  if (e.spinoBleedTick > 0 && e.spinoBleed > 0) return 0;
  e.spinoBleedTick = BLEED.tick;
  const n = e.spinoBleed > 0 ? Math.floor(e.spinoBleedOwed + 1e-9) : Math.round(e.spinoBleedOwed); e.spinoBleedOwed -= n;
  if (!(e.spinoBleed > 0)) { e.spinoBleed = 0; e.spinoBleedOwed = 0; }
  return n;
}
// The HUD icon: a dark-red drop over the Wayfarer's head, ringed by the still cure's progress. (x, y): the Wayfarer's feet in pixels.
export function drawBleedIcon(ctx, x, y, s, save, now = 0, quiet = false) {
  if (!bleeding(save)) return false;
  const I = BLEED.icon, r = s * I.size, cx = x, cy = y - s * I.lift, k = bleedStillShare(save), pulse = quiet ? 1 : .85 + .15 * Math.sin(now / 180);
  ctx.save();
  ctx.lineWidth = Math.max(2, r * .28); ctx.strokeStyle = I.track; ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2); ctx.stroke();
  if (k > 0) { ctx.strokeStyle = I.ring; ctx.beginPath(); ctx.arc(cx, cy, r * 1.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
  ctx.fillStyle = I.color; ctx.strokeStyle = I.rim; ctx.lineWidth = Math.max(1, r * .14);
  ctx.beginPath(); ctx.moveTo(cx, cy - r * pulse); ctx.quadraticCurveTo(cx + r * .8, cy + r * .1, cx, cy + r * .75); ctx.quadraticCurveTo(cx - r * .8, cy + r * .1, cx, cy - r * pulse); ctx.fill(); ctx.stroke();
  ctx.restore();
  return true;
}
