// Tool forms (release 533; Tim, 2026-10-28: "passive abilities... one can turn the blunderbuss's 3 shot cone spread into an
// arc... another can turn the great sweep... like 3 swords that float with you... they shoot at the nearest enemy... nanobot
// daggers... with a yellow sigil, so we can show that they are... physical").
//
// Two Lattice-only passives (lattice-fields.ts TOOL_FORMS, keys `field:arc-wave` and `field:nanoknives`) that change how
// a tool works. Both stay physical: they scale with Might like the tool they change.
// - Arc Wave: the Blunderbuss's three pellets become crescent waves along the same cone (release 549, Tim: "three larger
//   crescents that shoot out in... an arc... they would follow the same path of the blunderbuss's original shots"; 533 fired
//   one wave). Each wave is `share` × one pellet, catches foes `grow` tiles to either side of its path and passes through
//   `pierce` of them.
// - Nanoknives: the Great Sweep raises `count` nanobot daggers that circle you. Pressing the tool again throws the circling
//   daggers at your foe (the lock, else the nearest within `range`) and raises a fresh set. Release 539 (Tim: "they should
//   fire if there's an enemy nearby... if there's no enemy nearby... wait until I launch them"): `arm` s after rising, the
//   daggers throw themselves at the first foe within `autoRange` of you; with no foe that near they circle until you throw
//   them or one comes. Each dagger homes (`seekTurn`) and deals `share` of the tool's power. A press costs `cooldown` s,
//   a little faster than the sweep.
// - Corridor Golem (release 535; Tim: "when you hit the hammer, it'll summon a golem... dash to the nearest enemy and deliver
//   like 3 blows... if the enemy dies... to the next enemy... rises up out of the ground... melts back into the tiles"; the
//   quick golem): a Hammerfall blow raises a golem where it lands, unless one is already up or the last rose under
//   `cooldown` s ago (release 539: shortened by whatever shortens the tool's cooldown: its glyphs, armor's attack speed,
//   Wellspring Ground). After `rise` s it dashes to the nearest foe within `range` of it and punches (`share` of the tool's
//   power, `radius`, a `stun`), up to `punches` blows `gap` s apart, choosing the nearest again whenever its foe falls.
//   With no foe in reach, or its blows spent, it sinks back into the floor over `sink` s.
// - Cluster Shell (release 537; Tim: "for the rift bombard... its first initial explosion, two smaller explosions fly off of
//   it... a very short distance... and then they explode"): when a Bombard shell bursts, `count` bomblets fly off `angle`
//   radians to either side of its path at `speed`, then burst for `share` of the shell's damage in `radius` × its blast.
//   Release 539 (Tim: "a wider horizontal distance... the edges of their circles should touch... where the initial shell...
//   exploded"; then "random positions around the center... opposite poles of the circle"): they fly out at opposite ends
//   of a line through the burst whose angle changes from shell to shell, each exactly its own blast radius, so its blast's
//   edge meets the first burst's centre. Bomblets do not split again.
// Pure numbers and drawing; game.ts runs them (fireSecondary, nanoknivesPress, launchKnives, tickKnives, raiseGolem, tickGolem,
// clusterShell).
export const GOLEM = { share: .9, punches: 3, gap: .38, rise: .35, sink: .4, range: 4, radius: .9, stun: .25, cooldown: 6, reach: .7 };
// Fire Burst (release 547; Tim: "a spell... fire burst... launches out a series of fireballs that fly a short distance and
// explode... look exactly like those [cracked ember shells]"): `count` cinder shells in a fan `spread` radians wide toward the
// target, each flying `reach` tiles at `speed` (or to the first foe it meets) and bursting in the spell's radius for its
// damage. Magic: they grow with Focus, like the other spells. Drawn as dark shells with a glowing crack.
export const FIRE_BURST = { count: 5, spread: 1.4, reach: 2.6, speed: 9 };
export const CLUSTER = { count: 2, speed: 7, share: .45, radius: .55 };
export const ARC_WAVE = { share: 1, grow: .5, pierce: 12, speed: 11 }; // release 549: per wave, three waves (was one wave at 2.2, grow .75)
export const NANOKNIVES = { count: 3, share: .5, arm: .3, autoRange: 6, cooldown: .8, range: 9, speed: 13, life: 2.2, seekTurn: 9, orbitRadius: .95, spin: 2.6 }; // release 643: they fly on through a foe and curl back (life 1.4 → 2.2)

// Where dagger `i` of `n` circles at time `t` (seconds), as an offset in tiles.
export function knifeOffset(i, n, t) { const a = t * NANOKNIVES.spin + i * Math.PI * 2 / n; return { x: Math.cos(a) * NANOKNIVES.orbitRadius, y: Math.sin(a) * NANOKNIVES.orbitRadius * .7, a }; }

// Release r643-c53163bd6ab2 (Tim: "it could be fine for them to just be knives, but I like the great sword, the shuriken and the great axe
// better"): the three blades are a great sword, a shuriken and a great axe, one each, by their place in the set (`blade`).
export const SWEEP_BLADES = ["greatsword", "shuriken", "greataxe"];
function sweepBlade(ctx, x, y, a, s, i, spinAt) {
  const kind = SWEEP_BLADES[i % SWEEP_BLADES.length];
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = "#ffd23f2e"; ctx.beginPath(); ctx.arc(0, 0, s * .24, 0, 7); ctx.fill();
  ctx.strokeStyle = "#4d555e"; ctx.lineWidth = Math.max(1, s * .025);
  if (kind === "shuriken") { ctx.rotate(spinAt * 14); ctx.fillStyle = "#c9d1d8"; ctx.beginPath(); for (let k = 0; k < 4; k++) { const r = k * Math.PI / 2; ctx.lineTo(Math.cos(r) * s * .26, Math.sin(r) * s * .26); ctx.lineTo(Math.cos(r + Math.PI / 4) * s * .07, Math.sin(r + Math.PI / 4) * s * .07); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0, 0, s * .045, 0, 7); ctx.fill(); }
  else if (kind === "greataxe") { ctx.rotate(a); ctx.fillStyle = "#5a3d22"; ctx.fillRect(-s * .3, -s * .025, s * .52, s * .05); ctx.fillStyle = "#d9e0e6"; ctx.beginPath(); ctx.moveTo(s * .14, -s * .02); ctx.quadraticCurveTo(s * .32, -s * .2, s * .2, -s * .24); ctx.lineTo(s * .22, s * .24); ctx.quadraticCurveTo(s * .32, s * .2, s * .14, s * .02); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffd23f"; ctx.fillRect(s * .1, -s * .03, s * .04, s * .06); }
  else { ctx.rotate(a); ctx.fillStyle = "#e3e8ec"; ctx.beginPath(); ctx.moveTo(s * .42, 0); ctx.lineTo(s * .06, -s * .06); ctx.lineTo(-s * .12, -s * .05); ctx.lineTo(-s * .12, s * .05); ctx.lineTo(s * .06, s * .06); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(-s * .16, -s * .12, s * .04, s * .24); ctx.fillRect(-s * .28, -s * .025, s * .12, s * .05); ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(-s * .3, 0, s * .03, 0, 7); ctx.fill(); }
  ctx.restore();
}
// A rounded rectangle drawn with arcs, so it works where ctx.roundRect is missing (older Safari and Chrome).
function rounded(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// The golem: a squat stone figure with yellow sigil eyes, rising out of the floor and sinking back.
function drawGolem(ctx, game, toScreen, s) {
  const g = game.golem, now = game.lastUpdateNow || 0; if (!g || now < g.start) return;
  const up = g.sinkAt ? Math.max(0, 1 - (now - g.sinkAt) / (GOLEM.sink * 1000)) : Math.min(1, (now - g.start) / (GOLEM.rise * 1000)), [x, y] = toScreen(g), H = s * 1.05 * up, W = s * .75, f = g.face || 1;
  ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(x, y + s * .3, W * .7, s * .16, 0, 0, 7); ctx.fill();
  ctx.save(); try { ctx.beginPath(); ctx.rect(x - s, y + s * .32 - s * 1.6, s * 2, s * 1.6); ctx.clip(); // below the floor line it is still in the ground
  const top = y + s * .32 - H; ctx.fillStyle = "#857a68"; ctx.strokeStyle = "#3f382e"; ctx.lineWidth = 2;
  ctx.beginPath(); rounded(ctx, x - W / 2, top + s * .22, W, H, s * .12); ctx.fill(); ctx.stroke(); // body
  ctx.beginPath(); rounded(ctx, x - W * .3, top, W * .6, s * .3, s * .08); ctx.fill(); ctx.stroke(); // head
  const punching = now - (g.punchAt || -1e9) < 160, fx = x + f * (W / 2 + (punching ? s * .32 : s * .08)); ctx.beginPath(); ctx.arc(fx, top + s * .5, s * .17, 0, 7); ctx.fill(); ctx.stroke(); // the fist
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(x - W * .18, top + s * .1, s * .07, s * .06); ctx.fillRect(x + W * .18 - s * .07, top + s * .1, s * .07, s * .06); // sigil eyes
  } finally { ctx.restore(); } // the clip never outlives the golem, whatever happens while drawing it
}

export function drawToolForms(ctx, game, toScreen, s, t) {
  drawGolem(ctx, game, toScreen, s);
  for (const fx of game.effects) if (fx.fireBurst && fx.life > 0) { const [x, y] = toScreen(fx), k = 1 - fx.life / .32, R = fx.radius * s * (.5 + .6 * k); const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,236,160,${.9 * (1 - k)})`); g.addColorStop(.5, `rgba(255,128,40,${.7 * (1 - k)})`); g.addColorStop(1, "rgba(160,40,10,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); } // release 547: Fire Burst's flame
  for (const fx of game.effects) if (fx.kind === "golem-punch" && fx.life > 0) { const [x, y] = toScreen(fx); ctx.strokeStyle = "#e8d3a2"; ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, fx.life * 5); ctx.beginPath(); ctx.arc(x, y, fx.radius * s * (1.1 - fx.life * 2), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  const k = game.knives;
  if (k) { const n = k.count, [cx, cy] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }); for (let i = 0; i < n; i++) { const o = knifeOffset(i, n, (game.lastUpdateNow || 0) / 1000); sweepBlade(ctx, cx + o.x * s, cy + o.y * s, o.a + Math.PI / 2, s, i, (game.lastUpdateNow || 0) / 1000); } }
  for (const p of game.projectiles) {
    if (p.dead) continue;
    if (p.knife) { const [x, y] = toScreen(p); sweepBlade(ctx, x, y, Math.atan2(p.dy, p.dx), s, p.blade || 0, p.age || 0); }
    else if (p.fireBomb) { const [x, y] = toScreen(p), r = s * .2, spin = (p.age || 0) * 9; // release 547: a cinder shell, cracked and glowing
      ctx.fillStyle = "#ff7a2a33"; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
      ctx.fillStyle = "#5a2416"; ctx.strokeStyle = "#2a0e08"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#ff8a2a"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.beginPath(); for (const a of [spin - 1.6, spin + .5, spin + 2.6]) { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8); } ctx.stroke(); }
    else if (p.arcWave) { const [x, y] = toScreen(p), a = Math.atan2(p.dy, p.dx), R = (p.grow || ARC_WAVE.grow) * s; ctx.strokeStyle = "#e8c27a"; ctx.lineWidth = s * .14; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x - Math.cos(a) * R * .6, y - Math.sin(a) * R * .6, R, a - 1.1, a + 1.1); ctx.stroke(); ctx.globalAlpha = 1; }
  }
}
