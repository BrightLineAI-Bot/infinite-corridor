// Tool forms (release 533; Tim, 2026-10-28: "passive abilities... one can turn the blunderbuss's 3 shot cone spread into an
// arc... another can turn the great sweep... like 3 swords that float with you... they shoot at the nearest enemy... nanobot
// daggers... with a yellow sigil, so we can show that they are... physical").
//
// Two Lattice-only passives (lattice-fields.ts TOOL_FORMS, keys `field:arc-wave` and `field:nanoknives`) that change how
// a tool works. Both stay physical: they scale with Might like the tool they change.
// - Arc Wave: the Blunderbuss fires one wide wave instead of its three-pellet cone. The wave is `share` × one pellet, catches
//   foes `grow` tiles to either side of its path and passes through `pierce` of them.
// - Nanoknives: the Great Sweep raises `count` nanobot daggers that circle you for `hold` s. Pressing the tool again throws
//   the circling daggers at your foe (the lock, else the nearest within `range`) and raises a fresh set; daggers left alone
//   throw themselves when `hold` runs out, or fade if no foe is near. Each dagger homes (`seekTurn`) and deals `share` of the
//   tool's power. A press costs `cooldown` s, a little faster than the sweep.
// Pure numbers and drawing; game.ts runs them (fireSecondary, nanoknivesPress, launchKnives, tickKnives).
export const ARC_WAVE = { share: 2.2, grow: .75, pierce: 12, speed: 11 };
export const NANOKNIVES = { count: 3, share: .5, hold: 4, cooldown: .8, range: 9, speed: 13, life: 1.4, seekTurn: 9, orbitRadius: .95, spin: 2.6 };

// Where dagger `i` of `n` circles at time `t` (seconds), as an offset in tiles.
export function knifeOffset(i, n, t) { const a = t * NANOKNIVES.spin + i * Math.PI * 2 / n; return { x: Math.cos(a) * NANOKNIVES.orbitRadius, y: Math.sin(a) * NANOKNIVES.orbitRadius * .7, a }; }

// A nanobot dagger: a steel blade with a yellow sigil at the hilt, pointing along `a`.
function dagger(ctx, x, y, a, s) {
  const L = s * .34, W = s * .07, c = Math.cos(a), n = Math.sin(a);
  ctx.fillStyle = "#ffd23f33"; ctx.beginPath(); ctx.arc(x, y, s * .2, 0, 7); ctx.fill();
  ctx.fillStyle = "#d9e0e6"; ctx.strokeStyle = "#5d6670"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + c * L, y + n * L); ctx.lineTo(x - n * W, y + c * W); ctx.lineTo(x - c * L * .35, y - n * L * .35); ctx.lineTo(x + n * W, y - c * W); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(x - c * L * .45, y - n * L * .45, s * .05, 0, 7); ctx.fill();
}

export function drawToolForms(ctx, game, toScreen, s, t) {
  const k = game.knives;
  if (k) { const n = k.count, [cx, cy] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }); for (let i = 0; i < n; i++) { const o = knifeOffset(i, n, (game.lastUpdateNow || 0) / 1000); dagger(ctx, cx + o.x * s, cy + o.y * s, o.a + Math.PI / 2, s); } }
  for (const p of game.projectiles) {
    if (p.dead) continue;
    if (p.knife) { const [x, y] = toScreen(p); dagger(ctx, x, y, Math.atan2(p.dy, p.dx), s); }
    else if (p.arcWave) { const [x, y] = toScreen(p), a = Math.atan2(p.dy, p.dx), R = (p.grow || ARC_WAVE.grow) * s; ctx.strokeStyle = "#e8c27a"; ctx.lineWidth = s * .14; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x - Math.cos(a) * R * .6, y - Math.sin(a) * R * .6, R, a - 1.1, a + 1.1); ctx.stroke(); ctx.globalAlpha = 1; }
  }
}
