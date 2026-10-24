// Three spells from Infinite III (release 365; Tim, 2026-10-23: "let's add 3 more spells... after infinite 3... one of
// them will be like a shadow clone... the two others... you can figure em out").
//
// Shadow Clone (Tim): the first press deploys a shadow a set distance away: behind you when you are moving, beside you
// when you are still. The next tap on the world sets it where you tap, up to `placeRange` tiles from you. It keeps that
// offset as you move, through walls (it is a shadow), and copies every swing and tool shot at `share` of the damage. A
// second press while it lasts carries you to it, unless that ground is a wall or somewhere you cannot stand: "Blocked".
// Gravity Well: a slow vortex that drags foes toward its eye while it pulses (great beasts and bosses barely move).
// Release 367 (Tim: "Gravity well should pull... enemy shots as well... if they fly through... the well, then they should just
// get pulled to it... almost like a shield that just pulls in the shots that go in to it"): a hostile shot inside the swirl
// bends toward the eye and is swallowed there; shots that never enter it fly on untouched.
// Stillpoint: a pocket of held time. Foes inside are slowed, and hostile shots that enter it stop and fall apart.
//
// The spells are ordinary SPELLS entries (items.ts, `unlockTier`), so slots, presets, glyphs and cooldowns treat them like
// the others. This module holds their numbers and their per-frame behaviour; game.ts calls in, combat-visuals.ts draws.
// Release r387-413445097461 (Tim: "it should target... if you click on something... I should have a larger range for where you can cast
// it... if you're moving in a direction, it should be cast directly behind you... the normal distance is 5"): it falls
// `distance` tiles behind a moving Wayfarer, a tap may set it up to `placeRange` away, and its swings and shots go for the
// locked target (game.ts).
export const SHADOW_CLONE = { distance: 5, placeRange: 5, share: .5, blockedFor: 1 };
export const GRAVITY_WELL = { pull: 2.4, bossPull: .5, eye: .5, shotTurn: 9 }; // shotTurn (release 367): how hard it bends a hostile shot inside the swirl, per second
export const STILLPOINT = { slow: .4 };

const len = (x, y) => Math.hypot(x, y) || 1;
// Where a fresh clone goes, as an offset from the Wayfarer: behind the move, or beside the facing when still.
export function cloneOffset(move, facing, D = SHADOW_CLONE.distance) {
  if (move && Math.hypot(move.x, move.y) > .1) { const m = len(move.x, move.y); return { x: -move.x / m * D, y: -move.y / m * D }; }
  const f = facing && Math.hypot(facing.x, facing.y) > .1 ? facing : { x: 1, y: 0 }, m = len(f.x, f.y);
  return { x: -f.y / m * D, y: f.x / m * D }; // a quarter turn from where you face: to your side
}
// A tap sets the clone there, no farther than placeRange from the Wayfarer.
export function clampPlacement(dx, dy, range = SHADOW_CLONE.placeRange) {
  const m = Math.hypot(dx, dy); return m <= range ? { x: dx, y: dy } : { x: dx / m * range, y: dy / m * range };
}
export const clonePosition = (player, clone) => ({ x: player.x + clone.ox, y: player.y + clone.oy });

// Per frame: the Gravity Well pulls and Stillpoint holds. `enemies` and `projectiles` are the Game's; `open(x, y)` says
// whether a creature may stand there.
export function tickSpellFields(effects, enemies, projectiles, dt, now, open = () => true) {
  for (const fx of effects) {
    if (fx.delay > 0 || fx.life <= 0) continue;
    if (fx.kind === "gravity-well") for (const e of enemies) {
      if (e.dead || e.untargetable) continue;
      const cx = e.x + .5, cy = e.y + .45, dx = fx.x - cx, dy = fx.y - cy, d = Math.hypot(dx, dy);
      if (d > fx.radius || d < GRAVITY_WELL.eye) continue;
      const pull = (e.boss || e.worldBeast || e.farArrayBoss ? GRAVITY_WELL.bossPull : GRAVITY_WELL.pull) * dt, k = Math.min(pull, d - GRAVITY_WELL.eye) / d;
      if (open(e.x + dx * k, e.y + dy * k)) { e.x += dx * k; e.y += dy * k; } // never into a wall or a pit
    }
    if (fx.kind === "gravity-well") for (const p of projectiles) {
      if (!p.hostile || p.dead) continue;
      const dx = fx.x - p.x, dy = fx.y - p.y, d = Math.hypot(dx, dy);
      if (d > fx.radius) continue;
      if (d <= GRAVITY_WELL.eye) { p.dead = true; p.impact = { x: p.x, y: p.y }; continue; } // swallowed
      const k = Math.min(1, GRAVITY_WELL.shotTurn * dt), nx = p.dx + (dx / d - p.dx) * k, ny = p.dy + (dy / d - p.dy) * k, m = Math.hypot(nx, ny) || 1;
      p.dx = nx / m; p.dy = ny / m; p.homingTurnRate = 0; p.seekId = null; // it no longer steers for you
    }
    if (fx.kind === "stillpoint") {
      for (const e of enemies) if (!e.dead && Math.hypot(e.x + .5 - fx.x, e.y + .45 - fx.y) <= fx.radius) e.glyphSlow = { until: Math.max(e.glyphSlow?.until || 0, now + 250), factor: Math.min(e.glyphSlow?.factor || 1, STILLPOINT.slow) };
      for (const p of projectiles) if (p.hostile && !p.dead && Math.hypot(p.x - fx.x, p.y - fx.y) <= fx.radius) { p.dead = true; p.impact = { x: p.x, y: p.y }; }
    }
  }
}
