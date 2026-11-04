// Orbit Volley (release 487; Tim, 2026-10-27: "a spell that like rotates around the character. And then you hit it again, and
// it sends like a group of balls... at like whatever enemy it is... you can like, press it. And it starts going and then you
// charge it up, and then if you press it again, before... the timer runs out, it sends like a larger ball. If you just let it
// run out, it'll just send a regular ball... if you perfect time it... it does more damage... a series of balls that rotate
// around you, and then you can launch them, and it makes like a vortex swirl in front of you").
//
// The first press gathers orbs round the Wayfarer: `minOrbs` at once, one more every so often up to `maxOrbs` as the charge
// fills over `charge` s. The second press launches them as one ball at the aim (the lock, else auto target, else the way you
// face): `share` of the spell's power grows from 1 to 1 + `chargeBonus` with the charge. Pressed while the orbs glow gold
// (the charge between `perfectFrom` and `charge` s) it is perfect: `perfect` × the power, and a vortex opens where it lands
// (a small Gravity Well, `vortex`). Left alone past `window` s, the orbs go on their own as a plain ball. The ball flies at
// `speed` tiles a second, bursts on the first foe it reaches or at the aim, in `radius` (`bigRadius` when charged).
// Pure numbers and drawing; game.ts runs it (castOrbitVolley, tickOrbit).
export const ORBIT = { minOrbs: 3, maxOrbs: 7, charge: 2.4, perfectFrom: 2.0, window: 3.2, chargeBonus: 1, perfect: 2.4, speed: 12, radius: 1.1, bigRadius: 1.6, reach: 7, orbitRadius: 1.15, spin: 3.2, vortex: { radius: 2.2, life: 1.6, pulse: .4, share: .15 } };

// How far the charge has come (0..1) after `held` seconds, and whether that is the perfect moment.
export const orbitCharge = (held) => Math.max(0, Math.min(1, held / ORBIT.charge));
export const orbitPerfect = (held) => held >= ORBIT.perfectFrom && held <= ORBIT.charge;
export const orbitCount = (held) => Math.min(ORBIT.maxOrbs, ORBIT.minOrbs + Math.floor(orbitCharge(held) * (ORBIT.maxOrbs - ORBIT.minOrbs + 1)));
// The launch: { share, radius, perfect } for a press after `held` seconds (null when `timedOut`: the plain ball).
export function orbitLaunch(held, timedOut = false) {
  if (timedOut) return { share: 1, radius: ORBIT.radius, perfect: false };
  const perfect = orbitPerfect(held), k = orbitCharge(held);
  return { share: perfect ? ORBIT.perfect : 1 + ORBIT.chargeBonus * k, radius: k >= .5 ? ORBIT.bigRadius : ORBIT.radius, perfect };
}

export function drawOrbit(ctx, game, toScreen, s, t) {
  const o = game.orbit, now = game.lastUpdateNow || 0;
  if (o && !o.flight) {
    const held = (now - o.start) / 1000, n = orbitCount(held), gold = orbitPerfect(held), [cx, cy] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }), R = ORBIT.orbitRadius * s;
    for (let i = 0; i < n; i++) { const a = t * ORBIT.spin + i * Math.PI * 2 / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * .7, r = s * (.12 + .05 * orbitCharge(held));
      ctx.fillStyle = gold ? "#ffd86a55" : "#b48cff44"; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.fill();
      ctx.fillStyle = gold ? "#fff1b8" : "#e6d8ff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    const left = Math.max(0, ORBIT.window - held) / ORBIT.window; ctx.strokeStyle = gold ? "#ffd86a" : "#b48cff88"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke(); // the time left
  }
  const f = o?.flight;
  if (f) { const [x, y] = toScreen(f), r = s * (f.radius > ORBIT.radius ? .32 : .22); ctx.fillStyle = f.perfect ? "#ffd86a66" : "#b48cff55"; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.fill(); ctx.fillStyle = f.perfect ? "#fff1b8" : "#efe6ff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
}
