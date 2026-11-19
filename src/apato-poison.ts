// Root venom, the Earth Apatosaurus's poison (Tim, 2026-11-18: "it wraps its neck around the Wayfarer and sprays poison ... latched
// clones poison, and the poison stacks and intensifies the longer they hold and the more clones are on"). Its own status, like the
// Spinosaurus's bleed (bleed.ts), and not the elites' poison (elites.ts): its own numbers (POISON), its own icon and its own save
// record (save.apatoPoison, additive at schema 14, normalised by ensureApatoPoison in freshSave and migrateSave).
//
// - Venom is a number of stacks (fractional). Each stack takes POISON.perStack of the Wayfarer's maximum health a second; the owed
//   health is taken in whole points every POISON.tick seconds.
// - Doses add stacks. The Apatosaurus's own wrap can fill the venom up to POISON.max; clone latches only up to POISON.cloneMax, so
//   the beast's own poison is always the strongest (POISON.sources).
// - While a dose keeps coming the venom holds; once none has come for POISON.hold seconds it ebbs, one stack every POISON.ebb s.
// - Potions and other heals leave it alone (as the bleed): only time ends it.
// - A creature (the Spinosaurus or the Wild Stegosaurus in a duel) carries its venom on itself: e.apatoVenom (stacks) and
//   e.apatoVenomOwed; tickCreatureVenom returns the whole points to take (the caller takes them, so the duel's floors hold).
// Pure: no DOM, no randomness, no allocation per frame. The icon helper takes a canvas context and holds still under reduced motion.
export const POISON = {
  version: 1,
  perStack: .0035, /* of maximum health a second, per stack */
  max: 12, /* the Apatosaurus's wrap can fill this far */
  cloneMax: 7, /* clone latches only this far */
  tick: 1, /* seconds between the moments the owed health is taken */
  hold: 1.5, /* seconds with no dose before it ebbs */
  ebb: 1.2, /* seconds a stack takes to ebb away */
  // Where a dose comes from: `cap` the stacks that source can fill to.
  sources: { wrap: { cap: 12 }, clone: { cap: 7 }, spray: { cap: 12 } },
  // A creature's venom (the duel): the same stacks and ebb, a share of its own maximum health a second per stack.
  creature: { perStack: .0025, max: 12 },
  icon: { color: "#5fbf2f", rim: "#1f4a12", glow: "#d8ff8a", track: "rgba(20,40,8,.55)", size: .3, lift: 1.95 },
  text: { start: "Root venom burns in your veins!", gone: "The venom fades." },
};
const fresh = () => ({ stacks: 0, quiet: 0, tick: 0, owed: 0 });
const num = (v, lo = 0, hi = Infinity) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
// The save's venom record, normalised in place (unknown fields kept).
export function ensureApatoPoison(save) {
  if (!save || typeof save !== "object") return fresh();
  const old = save.apatoPoison && typeof save.apatoPoison === "object" && !Array.isArray(save.apatoPoison) ? save.apatoPoison : {};
  save.apatoPoison = { ...old, stacks: num(old.stacks, 0, POISON.max), quiet: num(old.quiet, 0, 1e6), tick: num(old.tick, 0, POISON.tick), owed: num(old.owed, 0, 1e6) };
  if (!(save.apatoPoison.stacks > 0)) Object.assign(save.apatoPoison, fresh());
  return save.apatoPoison;
}
const record = (save) => { const b = save?.apatoPoison; return b && typeof b === "object" && Number.isFinite(b.stacks) && Number.isFinite(b.quiet) && Number.isFinite(b.tick) && Number.isFinite(b.owed) ? b : ensureApatoPoison(save); };
export const poisoned = (save) => (Number(save?.apatoPoison?.stacks) || 0) > 0;
export const venomStacks = (save) => Math.max(0, Number(save?.apatoPoison?.stacks) || 0);
// A dose of `stacks` from `source` ("wrap" | "clone" | "spray"): never past that source's cap (a stronger venom already there stays).
// True when the venom newly started.
export function dosePoison(save, stacks, source = "clone") {
  const b = record(save), was = b.stacks > 0, cap = POISON.sources[source]?.cap ?? POISON.cloneMax, add = Math.max(0, Number(stacks) || 0);
  if (!(add > 0)) return false;
  if (b.stacks < cap) b.stacks = Math.min(cap, b.stacks + add);
  b.quiet = 0; if (!was) { b.tick = POISON.tick; b.owed = 0; }
  return !was && b.stacks > 0;
}
export function clearPoison(save) { if (save && typeof save === "object") save.apatoPoison = fresh(); }
// Health a second the venom takes now.
export const poisonDps = (stacks, maxHp, per = POISON.perStack) => Math.max(0, Number(stacks) || 0) * per * (Number(maxHp) || 0);
// One frame of venom. Returns the whole points of health to take now (0 most frames); `out.gone` true the frame it ebbs away.
const OUT = { damage: 0, gone: false };
export function tickPoison(save, dt, maxHp) {
  OUT.damage = 0; OUT.gone = false;
  const b = record(save); if (!(b.stacks > 0) || !(dt > 0)) return OUT;
  b.owed += poisonDps(b.stacks, maxHp) * dt;
  b.quiet += dt; if (b.quiet > POISON.hold) b.stacks = Math.max(0, b.stacks - dt / POISON.ebb);
  b.tick -= dt;
  if (b.tick <= 0 || !(b.stacks > 0)) { const n = b.stacks > 0 ? Math.floor(b.owed + 1e-9) : Math.round(b.owed); OUT.damage = n; b.owed -= n; b.tick += POISON.tick; if (b.tick <= 0) b.tick = POISON.tick; }
  if (!(b.stacks > 0)) { Object.assign(b, fresh()); b.stacks = 0; OUT.gone = true; }
  return OUT;
}
// A creature's venom (the duel): a dose of `stacks` on `e` (capped at POISON.creature.max).
export function doseCreature(e, stacks) {
  if (!e || e.dead) return;
  e.apatoVenom = Math.min(POISON.creature.max, (Number(e.apatoVenom) || 0) + Math.max(0, Number(stacks) || 0)); e.apatoVenomQuiet = 0;
  if (!Number.isFinite(e.apatoVenomTick)) e.apatoVenomTick = POISON.tick;
}
// One frame of a creature's venom: whole points to take now.
export function tickCreatureVenom(e, dt) {
  if (!(e?.apatoVenom > 0) || !(dt > 0)) return 0;
  e.apatoVenomOwed = (Number(e.apatoVenomOwed) || 0) + poisonDps(e.apatoVenom, e.maxHp, POISON.creature.perStack) * dt;
  e.apatoVenomQuiet = (Number(e.apatoVenomQuiet) || 0) + dt; if (e.apatoVenomQuiet > POISON.hold) e.apatoVenom = Math.max(0, e.apatoVenom - dt / POISON.ebb);
  e.apatoVenomTick = (Number.isFinite(e.apatoVenomTick) ? e.apatoVenomTick : POISON.tick) - dt;
  if (e.apatoVenomTick > 0 && e.apatoVenom > 0) return 0;
  e.apatoVenomTick = POISON.tick;
  const n = e.apatoVenom > 0 ? Math.floor(e.apatoVenomOwed + 1e-9) : Math.round(e.apatoVenomOwed); e.apatoVenomOwed -= n;
  if (!(e.apatoVenom > 0)) { e.apatoVenom = 0; e.apatoVenomOwed = 0; }
  return n;
}
// The HUD icon: a green droplet over the Wayfarer's head, its fill the venom's share of POISON.max. (x, y): the feet in pixels.
export function drawPoisonIcon(ctx, x, y, s, save, now = 0, quiet = false) {
  if (!poisoned(save)) return false;
  const I = POISON.icon, r = s * I.size, cx = x, cy = y - s * I.lift, k = Math.min(1, venomStacks(save) / POISON.max), pulse = quiet ? 1 : .9 + .1 * Math.sin(now / 140);
  ctx.save();
  ctx.lineWidth = Math.max(2, r * .28); ctx.strokeStyle = I.track; ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = I.glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  ctx.fillStyle = I.color; ctx.strokeStyle = I.rim; ctx.lineWidth = Math.max(1, r * .14);
  ctx.beginPath(); ctx.moveTo(cx, cy - r * pulse); ctx.quadraticCurveTo(cx + r * .85, cy + r * .15, cx, cy + r * .8); ctx.quadraticCurveTo(cx - r * .85, cy + r * .15, cx, cy - r * pulse); ctx.fill(); ctx.stroke();
  ctx.fillStyle = I.glow; ctx.beginPath(); ctx.arc(cx - r * .2, cy - r * .05, r * .16, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  return true;
}
