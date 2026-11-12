import { stampAttackVisual } from "./action-motion.js?v=r909-0dafb093063d";
import { hashSeed } from "./random.js?v=r909-0dafb093063d";
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
// - Mirage of Blades (release 649, in place of 533's Nanoknives; the Lattice key stays `field:nanoknives` so saves keep it):
//   each press of the Great Sweep throws one great blade (`MIRAGE`), spinning like a rotor, at your foe (the lock, else the
//   nearest within `range`, else where you aim). It flies `out` tiles, cutting through everything on the way, then turns and
//   homes on you wherever you have moved (`seekTurn`), cutting again on the way back, until it reaches you (`catch`) or `back`
//   s have passed. At most `max` fly at once: a press past that ends the oldest blade on its way home. Blades come in turn: a
//   great sword, a great axe, a great shuriken; an Echo glyph in the tool throws one more blade per copy. Each deals `share`
//   of the tool's power (Might), bursts with Volatile like any tool shot, and grows with Charged Air.
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
// Pure numbers and drawing; game.ts runs them (fireSecondary, mirageThrow, tickMirage, raiseGolem, tickGolem, sunburst,
// clusterShell).
export const GOLEM = { share: .9, punches: 3, gap: .38, rise: .35, sink: .4, range: 4, radius: .9, stun: .25, cooldown: 6, reach: .7 };
// Fire Burst (release 547; Tim: "a spell... fire burst... launches out a series of fireballs that fly a short distance and
// explode... look exactly like those [cracked ember shells]"): `count` cinder shells in a fan `spread` radians wide toward the
// target, each flying `reach` tiles at `speed` (or to the first foe it meets) and bursting in the spell's radius for its
// damage. Magic: they grow with Focus, like the other spells. Drawn as dark shells with a glowing crack.
export const FIRE_BURST = { count: 5, spread: 1.4, reach: 2.6, speed: 9 };
export const CLUSTER = { count: 2, speed: 7, share: .45, radius: .55 };
export const ARC_WAVE = { share: 1, grow: .5, pierce: 12, speed: 11 }; // release 549: per wave, three waves (was one wave at 2.2, grow .75)
// Release 649 (Tim, 2026-11-01: "a large sword that... moves out and swings, and then comes back to you... great sword... great
// axe... a huge shuriken... they should Pierce through... home towards me... for like 3 seconds... I only have 3 maximum at a
// time... hit on the way out and... on the way in... spinning... like the blades of a helicopter... grow with... charged air").
export const MIRAGE = { share: .7, speed: 11, backSpeed: 13, out: 5, back: 2.5, seekTurn: 14, catch: .55, max: 3, cooldown: .55, range: 9, spread: .35, grow: .38, size: 2.1, spin: 15 };

// Sunburst Ricochet (Tim, 2026-11-04: "the passive for the Lumen Spindle: when the shots hit a wall they bounce — they ricochet
// — and break off into a bunch of little pieces, like a sunburst, and those little pieces do damage... the ricocheting shots do
// damage as well"). A Lattice tool form (lattice-fields.ts TOOL_FORMS["lumen-sunburst"]). A Spindle shot that meets a wall (a
// blocked tile or a structure's wall; never the map's edge, which is a section seam, not a wall) reflects off it and flies on,
// still cutting what it passes, up to `ricochets` times; past that it turns back or ends as before. Each ricochet throws
// `shards` small shards in a fan `spread` radians wide about the wall's outward face, each flying `speed` tiles/s for `life` s
// and dealing `share` of the shot that broke (so they grow with Focus like the shot), passing through up to `pierce` foes and
// striking each foe once; at most `perEnemy` shards of one burst strike the same foe. At most `maxLive` shards fly at once (a
// burst past that throws only the room left). Shards carry no glyph host (no Volatile or Echo procs) and do not ricochet.
// Because a reflection retraces under the Spindle's own turn, a shot that ricocheted on its way out comes back the way it went
// and ricochets again at the same wall.
export const SUNBURST = { ricochets: 2, shards: 6, share: .3, spread: 2.4, speed: 8, life: .32, pierce: 3, perEnemy: 2, maxLive: 24, lift: .06 };

// Release 643 (Tim: "I like the great sword, the shuriken and the great axe better"): the blades, by `blade`; 649: in Tim's order.
export const SWEEP_BLADES = ["greatsword", "greataxe", "shuriken"];
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
// Pure presentation from actual producer events. Repositioning remains instantaneous;
// a punch is already resolved at punchAt, so its visible motion starts extended.
export function golemPresentation(g, now) {
  if (!g || now < g.start) return null;
  const up=g.sinkAt?Math.max(0,1-(now-g.sinkAt)/(GOLEM.sink*1000)):Math.max(0,Math.min(1,(now-g.start)/(GOLEM.rise*1000)));
  const age=now-(g.punchAt??-1e9),recover=age>=0&&age<GOLEM.gap*1000;
  return {kind:'corridorGolem',x:g.x,y:g.y+.32,supportX:g.x,supportY:g.y,
    scale:1.05/1.49,lift:(up-1)*1.05,yaw:(g.face||1)<0?Math.PI:0,
    pose:recover?'fist':'idle',amount:recover?age/(GOLEM.gap*1000):0,
    fistStep:(GOLEM.punches-g.punches)%2===0?2:1,pace:0,alpha:up>0?1:0};
}
// The golem: a squat stone figure with yellow sigil eyes, rising out of the floor and sinking back.
export function drawGolem(ctx, game, toScreen, s, clock = game.lastUpdateNow || 0, shadow = true) {
  const g = game.golem, now = clock; if (!g || now < g.start) return;
  const up = g.sinkAt ? Math.max(0, 1 - (now - g.sinkAt) / (GOLEM.sink * 1000)) : Math.min(1, (now - g.start) / (GOLEM.rise * 1000)), [x, y] = toScreen(g), H = s * 1.05 * up, W = s * .75, f = g.face || 1;
  if(shadow){ctx.fillStyle = "#00000033"; ctx.beginPath(); ctx.ellipse(x, y + s * .3, W * .7, s * .16, 0, 0, 7); ctx.fill();}
  ctx.save(); try { ctx.beginPath(); ctx.rect(x - s, y + s * .32 - s * 1.6, s * 2, s * 1.6); ctx.clip(); // below the floor line it is still in the ground
  const top = y + s * .32 - H; ctx.fillStyle = "#857a68"; ctx.strokeStyle = "#3f382e"; ctx.lineWidth = 2;
  for(const side of [-1,1]){ctx.beginPath();rounded(ctx,x+side*s*.19-s*.15,y+s*.32-s*.18*up,s*.3,s*.18*up,s*.035);ctx.fill();ctx.stroke();}
  ctx.beginPath(); rounded(ctx, x - W / 2, top + s * .22, W, H, s * .12); ctx.fill(); ctx.stroke(); // body
  ctx.beginPath(); rounded(ctx, x - W * .3, top, W * .6, s * .3, s * .08); ctx.fill(); ctx.stroke(); // head
  const pose=golemPresentation(g,now),drive=pose.pose==='fist'?(1-pose.amount)*(1-pose.amount):0;
  const fx = x + f * (W / 2 + s * (.08 + .24 * drive)); ctx.beginPath(); ctx.arc(fx, top + s * .5, s * .17, 0, 7); ctx.fill(); ctx.stroke(); // the fist
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(x - W * .18, top + s * .1, s * .07, s * .06); ctx.fillRect(x + W * .18 - s * .07, top + s * .1, s * .07, s * .06); // sigil eyes
  } finally { ctx.restore(); } // the clip never outlives the golem, whatever happens while drawing it
}

export function drawToolForms(ctx, game, toScreen, s, t, capture = null) {
  const g=game.golem,clock=capture?.now??game.lastUpdateNow??0;
  const captured=g&&clock>=g.start&&capture?.captureActor?.({source:g,x:g.x,y:g.y+.32,height:1.5,
    draw:(c,unit)=>drawGolem(c,game,q=>[q.x*unit,q.y*unit],unit,clock,false),
    sample:(now)=>golemPresentation(g,now)});
  if(captured){const [x,y]=toScreen(g);ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(x,y+s*.3,s*.75*.7,s*.16,0,0,7);ctx.fill();}
  else drawGolem(ctx, game, toScreen, s);
  for (const fx of game.effects) if (fx.fireBurst && fx.life > 0) { const [x, y] = toScreen(fx), k = 1 - fx.life / .32, R = fx.radius * s * (.5 + .6 * k); const g = ctx.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,236,160,${.9 * (1 - k)})`); g.addColorStop(.5, `rgba(255,128,40,${.7 * (1 - k)})`); g.addColorStop(1, "rgba(160,40,10,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); } // release 547: Fire Burst's flame
  { // Sunburst Ricochet's shards: one path for all of them (they are many and small); streaks only at full motion and quality
    const pr = game.presentation || {}, still = pr.reduceMotion || pr.safeMode || pr.effectiveQuality === "low"; let any = false;
    ctx.strokeStyle = "#ffe39a"; ctx.fillStyle = "#ffe39a"; ctx.lineWidth = Math.max(1.5, s * .06); ctx.beginPath();
    for (const p of game.projectiles) if (p.shard && !p.dead) { const [x, y] = toScreen(p); any = true;
      if (still) { const r = Math.max(1.5, s * .07); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7); }
      else { const k = s * .22 * Math.min(1, (p.age || 0) * 12 + .4); ctx.moveTo(x, y); ctx.lineTo(x - p.dx * k, y - p.dy * k); } }
    if (any) { if (still) ctx.fill(); else ctx.stroke(); }
  }
  for (const fx of game.effects) if (fx.kind === "golem-punch" && fx.life > 0) { const [x, y] = toScreen(fx); ctx.strokeStyle = "#e8d3a2"; ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, fx.life * 5); ctx.beginPath(); ctx.arc(x, y, fx.radius * s * (1.1 - fx.life * 2), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const p of game.projectiles) {
    if (p.dead) continue;
    if (p.mirage) { const [x, y] = toScreen(p), k = MIRAGE.size * (p.scale || 1), spin = (p.age || 0) * MIRAGE.spin; // release 649: a rotor of steel
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.strokeStyle = "#ffffff26"; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.arc(0, 0, s * .38, 0, 7); ctx.stroke(); sweepBlade(ctx, 0, 0, spin, s, p.blade || 0, p.age || 0); ctx.restore(); }
    else if (p.fireBomb && !capture?.has?.(p)) { const [x, y] = toScreen(p), r = s * .2, spin = (p.age || 0) * 9; // release 547: a cinder shell, cracked and glowing
      ctx.fillStyle = "#ff7a2a33"; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
      ctx.fillStyle = "#5a2416"; ctx.strokeStyle = "#2a0e08"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#ff8a2a"; ctx.lineWidth = Math.max(1.5, s * .045); ctx.beginPath(); for (const a of [spin - 1.6, spin + .5, spin + 2.6]) { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8); } ctx.stroke(); }
    else if (p.arcWave) { const [x, y] = toScreen(p), a = Math.atan2(p.dy, p.dx), R = (p.grow || ARC_WAVE.grow) * s; ctx.strokeStyle = "#e8c27a"; ctx.lineWidth = s * .14; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(x - Math.cos(a) * R * .6, y - Math.sin(a) * R * .6, R, a - 1.1, a + 1.1); ctx.stroke(); ctx.globalAlpha = 1; }
  }
}

// ================================================================ the Aether Orrery
// The Aether Orrery (Tim, 2026-11-04: a magic-damage tool beside the Lumen Spindle; "an orb that flies relatively fast...
// as it flies it sheds little pellets slowly in different directions... a cone of magical sparks... a big magic orb... that
// passes through enemies... if you overcharge... you can't charge again for about 6 seconds... orbs that circle... fire small
// lasers toward enemies (like drones)... a triangle of energy between them... three lasers... turn at right angles... a
// two-hit combo... the clone gets its own orb... a laser tether connects the Wayfarer and the clone").
//
// A tool (secondary slot), magic: every number below is a share of `orreryPower` (game.ts), which is spell power
// (SPELL_POWER: Focus and magic bonus, as the 739 balance pass made spells match Might) times the tool's glyph damage, the
// Pairing's and armor's spell damage. It is not Might.
// - Tap: an orb (`tap`) flies fast and bursts on the first foe; every `shedEvery` s of flight it sheds a slow pellet
//   (`pellet`) a golden angle round from the last, so a few orbs fired ahead leave a drifting field of magic behind them.
// - Hold: after `charge.grace` s a cone of sparks (`cone`) streams from the Wayfarer toward the aim, pulsing magic damage,
//   and you may walk while charging. Let go: a great orb (`big`) flies out through every foe, stronger the longer it was
//   held (full at `charge.full` s). There is no charge cooldown, but holding past `charge.max` s overloads it: the charge
//   is lost and none can start for `charge.lockout` s (taps still fire). `orreryLockUntil` is a game clock (pause/resume).
// - Circling orbs, the tool's passive (Tim, 2026-11-05: one orb with no Echo, two with one Echo, three with two; a third Echo
//   adds nothing): `halo.base` + the Echo glyphs in the tool, `halo.max` at most. The first press deploys
//   them round the Wayfarer (`halo`); they burn what they touch. While they circle, each press also makes every orb fire a
//   small laser at a foe (`drone`). Charging spreads them out: three form a triangle of energy, two a single beam, burning
//   foes inside or touching it (`beam`); one orb has no beam and only burns what it touches. Letting a charge go fires one
//   laser per orb (`cube`, three at the full tier), each at a
//   foe ahead (a different one where it can): it passes through the first foe, runs on `overshoot` tiles, then turns at right
//   angles (a square, blocky path: `minSide`, `minLeg`, `onLine`, at most `turns` corners) back through a foe (the nearest its
//   sibling lasers have not claimed, else the same one), the second hit of its combo, and ends. The orbs
//   go after `halo.idle` s without a press, on a new floor, on death and on Wayglass travel; they are not saved.
// - With a Shadow Clone up: the clone carries an orb of its own (not part of the triangle) that fires a straight laser at
//   each press and each release, striking its foe twice (`clone`); while charging, a tether of light joins you and the clone
//   and burns what it touches (`beam`). A foe touched by several beams (triangle edges, the tether) takes one pulse per beam.
// Pellets, drone lasers and pulses carry the tool's glyph damage but no glyph procs (Ignite, Leech...), and are not blows for
// the frenzy; the orb, the great orb and the right-angle lasers are full tool hits. The clone's lasers, like its copies of
// other tool shots, carry no glyph procs.
// Bounded: at most `caps` of each kind live, all inside the area's projectile cap; a frame allocates nothing but new shots.
// game.ts runs it (fireSecondary → orreryPress, update → tickOrrery, the projectile hit hook → orreryOnHit); drawOrrery draws.

const LOCKOUT = 6; // s without charging after an overload (Tim: "about 6 seconds")
export const ORRERY = {
  item: { id: "secondary-aether-orrery", name: "Aether Orrery", slot: "secondary", power: 12, tier: "rare", property: "orrery" },
  flag: "gear:aether-orrery",
  band: 13, // given once at Infinite III, like the brawler gear (APERTURE_BANDS index)
  base: 10, // its spell damage (SPELL_POWER's `damage`)
  tap: { share: .66, cooldown: .4, speed: 10, life: .8, grow: .12, shedEvery: .08 },
  pellet: { share: .24, speed: 2.4, life: 1.5, grow: .06, turn: 2.39996 },
  charge: { grace: .2, full: 1.6, max: 2.6, lockout: LOCKOUT, pulse: .2 },
  cone: { share: .41, range: 3.3, half: .6 },
  big: { min: 1.2, max: 3.1, speed: 7.5, life: 1.4, grow: .5 },
  halo: { base: 1, max: 3, radius: 1.2, chargeRadius: 1.9, spin: 2.4, idle: 8, contact: .42, contactShare: .3, pulse: .3 },
  drone: { share: .43, speed: 18, life: .45, range: 7 },
  beam: { share: .36, touch: .3 },
  cube: { share: .72, speed: 12, out: 6, overshoot: 1, minSide: 1.1, minLeg: .4, onLine: .3, seek: 7, life: 2.4, turns: 5, grow: .16 },
  clone: { share: .66, gap: .12, speed: 16, life: .6, orbit: .7 },
  caps: { orbs: 6, pellets: 30, bigs: 2, lasers: 12 },
  sparks: { low: 6, balanced: 12, full: 20 },
  messages: { over: `The Orrery overloads: it cannot charge for ${LOCKOUT} s.`, locked: "The Orrery is still overloaded.", given: "In your pack: the Aether Orrery, a magic tool (Focus)." },
  text: "A magic tool (Focus). Tap: an orb that sheds drifting pellets. Hold: a cone of sparks, then a great orb through every foe; holding too long overloads it for 6 s. An orb circles you (two with one Echo glyph, three with two): orbs burn what they touch and fire lasers with each press; while you charge, two form a burning beam and three a burning triangle; on release each looses a right-angle laser. With a Shadow Clone: its own orb and a burning tether.",
};

// ---------------------------------------------------------------- pure rules
export const orbTier = (echoes) => Math.min(ORRERY.halo.max, ORRERY.halo.base + Math.max(0, Math.floor(Number(echoes) || 0))); // 1, 2, 3 orbs for 0, 1, 2+ Echoes
export const chargeShare = (held) => { const B = ORRERY.big, k = Math.max(0, Math.min(1, (held - ORRERY.charge.grace) / (ORRERY.charge.full - ORRERY.charge.grace))); return B.min + (B.max - B.min) * k; };
export const overcharged = (held) => held > ORRERY.charge.max;
export function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy, k = L > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L)) : 0;
  return Math.hypot(px - ax - vx * k, py - ay - vy * k);
}
export function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
export function inCone(px, py, ox, oy, dx, dy, range, half, body = 0) {
  const x = px - ox, y = py - oy, r = Math.hypot(x, y); if (r > range + body) return false; if (r < .5 + body) return true;
  return Math.acos(Math.max(-1, Math.min(1, (x * dx + y * dy) / r))) <= half + Math.atan2(body, r);
}
// How many beams touch a body at (x, y) of radius `body`: the triangle's edges (or the single beam between two orbs), and
// the tether; a body inside the triangle that no edge touches counts as one.
export function beamsTouching(x, y, body, pts, n, tether) {
  const T = ORRERY.beam.touch + body; let k = 0;
  if (n === 2 && segDist(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= T) k++;
  if (n >= 3) { for (let i = 0; i < 3; i++) { const a = pts[i], b = pts[(i + 1) % 3]; if (segDist(x, y, a.x, a.y, b.x, b.y) <= T) k++; } if (!k && inTriangle(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y)) k = 1; }
  if (tether && segDist(x, y, tether.ax, tether.ay, tether.bx, tether.by) <= T) k++;
  return k;
}
const unit = (x, y, fx = 1, fy = 0) => { const m = Math.hypot(x, y); return m > 1e-3 ? { x: x / m, y: y / m } : { x: fx, y: fy }; };
const live = (e) => e && !e.dead && !e.untargetable && !e.hidden && e.kind !== "npc";

// The runtime state (game.orrery), never saved: { halo: { n, angle, idle, where, pts }, charge: { held, action, dir, pulse },
// pulse (the halo's contact clock) }. `pts` holds the orb places, reused every frame.
function state(game) { return (game.orrery ||= { halo: null, charge: null, contact: 0, clonePt: { x: 0, y: 0 } }); }
export function orbCount(game) { const h = game.orrery?.halo; return h ? h.n : 0; }
function count(game, kind) { let n = 0; for (const p of game.projectiles) if (!p.dead && p.orrery === kind) n++; return n; }
function room(game) { let n = 0; for (const p of game.projectiles) if (!p.dead) n++; return (game.area === "dungeon" ? 32 : 64) - n; }
function centre(game) { const p = game.player; return { x: p.x + .5, y: p.y + .45 }; }
// The foes nearest to (x, y) within `range`, nearest first, at most `k` (a press-time scan, not per frame).
function nearest(game, x, y, range, k) {
  const out = [];
  for (const e of game.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x + .5 - x, e.y + .45 - y); if (d > range) continue; out.push({ e, d }); }
  out.sort((a, b) => a.d - b.d); return out.slice(0, k).map((q) => q.e);
}
function aimFrom(game, at, fallback) {
  const t = game.lockedTarget?.(); if (live(t)) return unit(t.x + .5 - at.x, t.y + .45 - at.y, fallback.x, fallback.y);
  const f = nearest(game, at.x, at.y, ORRERY.drone.range, 1)[0]; return f ? unit(f.x + .5 - at.x, f.y + .45 - at.y, fallback.x, fallback.y) : fallback;
}
function id(game, kind) { return `orrery-${kind}-${(game.save.effectCounter = (game.save.effectCounter || 0) + 1)}`; }
function shot(game, kind, x, y, d, speed, life, damage, extra = {}) {
  const q = { id: id(game, kind), x, y, dx: d.x, dy: d.y, speed, life, damage: Math.max(1, Math.round(damage)), damageType: "magic", path: "straight", age: 0, hits: {}, pierce: 0, glyphHost: "tool", orrery: kind, ...extra };
  game.projectiles.push(q); return q;
}
export function placeHalo(game, h, spread = 0) {
  const P = game.player, cx = P.x + .5, cy = P.y + .45, R = ORRERY.halo.radius + (ORRERY.halo.chargeRadius - ORRERY.halo.radius) * spread;
  for (let i = 0; i < h.n; i++) { const a = h.angle + i * Math.PI * 2 / h.n; h.pts[i].x = cx + Math.cos(a) * R; h.pts[i].y = cy + Math.sin(a) * R * .8; }
}
const CLONE_AT = { x: 0, y: 0 };
function clonePlace(game, now) {
  if (!game.shadowCloneActive?.(now) || game.shadowClone.charging || game.shadowClone.boxing) return null;
  const c = game.shadowClone, p = game.player; CLONE_AT.x = p.x + (Number(c.ox) || 0) + .5; CLONE_AT.y = p.y + (Number(c.oy) || 0) + .45; return CLONE_AT; // one scratch point, read at once by each caller
}

// ---------------------------------------------------------------- the press
// A press of the tool: the tap orb (on its cooldown), the drone lasers or the halo, the clone's laser, and the start of a
// charge (unless overloaded or already charging). `action` is the button that is held for the charge (null: a tap only).
export function orreryPress(game, now, dir, action = null) {
  const O = ORRERY, S = state(game), p = game.player, c = centre(game), power = game.orreryPower(), d = unit(dir?.x ?? game.save.lastAim?.x ?? 0, dir?.y ?? game.save.lastAim?.y ?? 0, 1, 0);
  game.save.lastAim = d; let fired = false;
  const echoes = typeof game.takeRound === "function" ? game.glyphLoadout("tool").count("echo") : 0; // ROUNDS: a tap orb takes a round
  const round = now >= (game.toolReadyAt || 0) && room(game) > 0 && count(game, "orb") < O.caps.orbs ? (typeof game.takeRound === "function" ? game.takeRound(echoes) : "ordinary") : null;
  if (round) {
    game.toolReadyAt = now + O.tap.cooldown * 1000 * game.toolCooldownScale();
    shot(game, "orb", c.x + d.x * .35, c.y + d.y * .35, d, O.tap.speed, O.tap.life, power * O.tap.share * roundDamage(round), { grow: O.tap.grow, shedAcc: 0, shedTurn: Math.atan2(d.y, d.x), ...(round === "empowered" ? { empowered: true } : {}) });
    p.attackUntil = now + 160; stampAttackVisual(p, "orrery-tap", 160, d); fired = true;
    const tier = orbTier(game.glyphLoadout("tool").count("echo"));
    if (tier && S.halo && S.halo.where === game.orreryWhere()) { // the circling orbs fire, one laser each
      S.halo.idle = O.halo.idle; S.halo.n = tier; const foes = nearest(game, c.x, c.y, O.drone.range, S.halo.n);
      for (let i = 0; i < S.halo.n && room(game) > 0 && count(game, "drone") < O.caps.lasers; i++) { const at = S.halo.pts[i], f = foes.length ? foes[i % foes.length] : null, ld = f ? unit(f.x + .5 - at.x, f.y + .45 - at.y, d.x, d.y) : d; shot(game, "drone", at.x, at.y, ld, O.drone.speed, O.drone.life, power * O.drone.share, { glyphHost: null, minor: true }); }
    } else if (tier) { S.halo = { n: tier, angle: 0, idle: O.halo.idle, where: game.orreryWhere(), pts: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }] }; placeHalo(game, S.halo); }
    else S.halo = null;
    cloneLaser(game, now, d, power);
  }
  if (action && !S.charge) {
    if (now < (game.orreryLockUntil || 0)) { if (!fired) game.message = O.messages.locked; }
    else if (typeof game.takeRound === "function" && !canFireRound(game.save, echoes)) { if (!fired) game.message = `${ROUNDS.messages.empty} (${roundIronCost(echoes)} a round).`; } // ROUNDS: no charge with nothing to release
    else S.charge = { held: 0, action, dir: { x: d.x, y: d.y }, pulse: 0 };
  }
  return fired || !!S.charge;
}
function cloneLaser(game, now, d, power) {
  const at = clonePlace(game, now), O = ORRERY; if (!at || room(game) <= 0 || count(game, "clone") >= O.caps.lasers) return;
  const S = state(game), q = S.clonePt, cd = aimFrom(game, q.x || q.y ? q : at, d);
  shot(game, "clone", (q.x || at.x), (q.y || at.y), cd, O.clone.speed, O.clone.life, power * O.clone.share, { knife: true, combo: 0, glyphHost: null, shadow: true });
}

// ---------------------------------------------------------------- a frame
export function tickOrrery(game, dt, now, held) {
  const S = game.orrery, O = ORRERY, armed = !!game.save.equipment?.secondary && game.isOrrery?.();
  if (S && !armed) { S.halo = null; S.charge = null; }  if (game.projectiles.length) tickShots(game, dt, now);
  if (!S) return;
  const h = S.halo;
  if (h) {
    h.idle -= dt; h.angle += O.halo.spin * dt * (game.presentation?.reduceMotion || game.presentation?.safeMode ? .5 : 1);
    if (h.idle <= 0 || h.where !== game.orreryWhere()) S.halo = null;
    else {
      placeHalo(game, h, S.charge && S.charge.held >= O.charge.grace ? Math.min(1, S.charge.held / O.charge.full) : 0);
      S.contact -= dt;
      if (S.contact <= 0) { S.contact += O.halo.pulse; const power = game.orreryPower() * O.halo.contactShare;
        for (const e of game.enemies) { if (!live(e)) continue; const ex = e.x + .5, ey = e.y + .45, R = O.halo.contact + bodyOf(game, e); for (let i = 0; i < h.n; i++) if (Math.hypot(h.pts[i].x - ex, h.pts[i].y - ey) <= R) game.orreryStrike(e, power, now); } }
    }
  }
  { const at = clonePlace(game, now); if (at) { const a = (h ? h.angle : now / 1000 * O.halo.spin) * 1.3; S.clonePt.x = at.x + Math.cos(a) * O.clone.orbit; S.clonePt.y = at.y + Math.sin(a) * O.clone.orbit * .8; } else S.clonePt.x = S.clonePt.y = 0; }
  const c = S.charge; if (!c) return;
  if (!held) { S.charge = null; if (c.held >= O.charge.grace) release(game, c, now); return; }
  c.held += dt;
  if (overcharged(c.held)) { S.charge = null; game.orreryLockUntil = now + O.charge.lockout * 1000; game.message = O.messages.over; return; }
  if (c.held < O.charge.grace) return;
  { const aim = game.lockedDirection?.() || game.save.lastAim; const m = aim ? Math.hypot(aim.x, aim.y) : 0; if (m > 1e-3) { c.dir.x = aim.x / m; c.dir.y = aim.y / m; } } // the cone follows the lock, else the aim (in place)
  c.pulse -= dt; if (c.pulse > 0) return; c.pulse += O.charge.pulse;
  const power = game.orreryPower(), o = centre(game), pts = h ? h.pts : null, n = h ? h.n : 0, at = clonePlace(game, now), tether = at ? { ax: o.x, ay: o.y, bx: at.x, by: at.y } : null;
  for (const e of game.enemies) {
    if (!live(e)) continue; const ex = e.x + .5, ey = e.y + .45, b = bodyOf(game, e);
    if (inCone(ex, ey, o.x, o.y, c.dir.x, c.dir.y, O.cone.range, O.cone.half, b)) game.orreryStrike(e, power * O.cone.share, now);
    const k = n >= 2 || tether ? beamsTouching(ex, ey, b, pts, n, tether) : 0; if (k) game.orreryStrike(e, power * O.beam.share * k, now);
  }
}
function bodyOf(game, e) { return typeof game.bodyRadius === "function" ? game.bodyRadius(e) : .38; }
function release(game, c, now) {
  const O = ORRERY, S = state(game), o = centre(game), power = game.orreryPower(), d = c.dir;
  if (room(game) > 0 && count(game, "big") < O.caps.bigs) { const round = typeof game.takeRound === "function" ? game.takeRound(game.glyphLoadout("tool").count("echo")) : "ordinary"; // ROUNDS: the great orb takes a round
    if (!round) { S.charge = null; return; }
    shot(game, "big", o.x + d.x * .4, o.y + d.y * .4, d, O.big.speed, O.big.life, power * chargeShare(c.held) * roundDamage(round), { knife: true, grow: O.big.grow, ...(round === "empowered" ? { empowered: true } : {}) }); }
  const h = S.halo;
  if (h && h.where === game.orreryWhere()) { h.idle = O.halo.idle; const volley = id(game, "volley"), ahead = nearest(game, o.x, o.y, O.cube.out, 6).filter((e) => (e.x + .5 - o.x) * d.x + (e.y + .45 - o.y) * d.y > 0); // forward: each laser at a foe ahead (a different one where it can), else a fan
    for (let i = 0; i < h.n && room(game) > 0 && count(game, "cube") < O.caps.lasers; i++) { const f = ahead.length ? ahead[i % ahead.length] : null, a = (i - (h.n - 1) / 2) * .18, cs = Math.cos(a), sn = Math.sin(a), ld = f ? unit(f.x + .5 - h.pts[i].x, f.y + .45 - h.pts[i].y, d.x, d.y) : { x: d.x * cs - d.y * sn, y: d.x * sn + d.y * cs };
      shot(game, "cube", h.pts[i].x, h.pts[i].y, ld, O.cube.speed, O.cube.life, power * O.cube.share, { knife: true, grow: O.cube.grow, combo: 0, cube: { phase: "out", dist: 0, leg: 0, turns: 0, side: i % 2 ? -1 : 1, targetId: null, volley, fx: ld.x, fy: ld.y, corners: [] } }); }
  }
  cloneLaser(game, now, d, power);
  game.player.attackUntil = now + 220; stampAttackVisual(game.player, "orrery-release", 220, d); game.message = "The Orrery releases!";
}

// The shots' own motion: orbs shed pellets, the right-angle lasers turn, the clone's laser lands its second hit.
function tickShots(game, dt, now) {
  const O = ORRERY; let pellets = -1, space = -1;
  for (const p of game.projectiles) {
    if (p.dead || !p.orrery) continue;
    if (p.orrery === "orb") {
      p.shedAcc = (p.shedAcc || 0) + dt;
      while (p.shedAcc >= O.tap.shedEvery) { p.shedAcc -= O.tap.shedEvery;
        if (pellets < 0) { pellets = count(game, "pellet"); space = room(game); }
        if (pellets >= O.caps.pellets || space <= 0) continue;
        p.shedTurn = (p.shedTurn || 0) + O.pellet.turn; const d = { x: Math.cos(p.shedTurn), y: Math.sin(p.shedTurn) };
        shot(game, "pellet", p.x, p.y, d, O.pellet.speed, O.pellet.life, p.damage * O.pellet.share / O.tap.share, { grow: O.pellet.grow, glyphHost: null, minor: true }); pellets++; space--; }
    } else if (p.orrery === "clone" && p.combo === 1 && p.age - p.comboAt >= O.clone.gap) {
      const e = game.enemies.find((q) => q.id === p.firstId); if (live(e)) game.orreryStrike(e, p.damage, now); p.dead = true; p.combo = 2;
    } else if (p.cube) steerCube(game, p, dt);
  }
}
// The right-angle laser: "out" straight ahead until its first hit (or `out` tiles), "over" `overshoot` tiles on, then a
// right angle to the side its foe lies (at least `minSide` tiles), a right angle back along its first line, and a right angle
// across whenever it passes its foe's line, up to `turns` corners: a square, blocky path that comes back through the foe.
function steerCube(game, p, dt) {
  const O = ORRERY.cube, q = p.cube; q.dist += p.speed * dt;
  if (q.phase === "out") { if (q.dist >= O.out) { q.phase = "over"; q.dist = O.overshoot; } return; }
  if (q.phase === "over") { if (q.dist < O.overshoot) return; seek(game, p);
    const t = target(game, q), nx = -p.dy, ny = p.dx, side = t ? (t.x + .5 - p.x) * nx + (t.y + .45 - p.y) * ny : 0, s = Math.abs(side) > O.onLine ? (side >= 0 ? 1 : -1) : q.side;
    turn(p, nx * s, ny * s); q.phase = "side"; q.leg = Math.max(O.minSide, Math.abs(side)); return; }
  const t = target(game, q), nx = -p.dy, ny = p.dx;
  if (q.phase === "side") { if (q.dist < q.leg) return; const a = t ? (t.x + .5 - p.x) * nx + (t.y + .45 - p.y) * ny : -1, s = a >= 0 ? 1 : -1; turn(p, nx * s, ny * s); q.phase = "leg"; return; }
  if (!t || q.turns >= O.turns || q.dist < O.minLeg) return;
  const rx = t.x + .5 - p.x, ry = t.y + .45 - p.y; if (rx * p.dx + ry * p.dy > 0) return; // still short of its foe's line
  const lateral = rx * nx + ry * ny;
  if (Math.abs(lateral) <= O.onLine) { turn(p, nx * q.side, ny * q.side); q.phase = "side"; q.leg = O.minSide; return; } // went along it: a new square
  const s = lateral >= 0 ? 1 : -1; turn(p, nx * s, ny * s);
}
function target(game, q) { if (!q.targetId) return null; const e = game.enemies.find((o) => o.id === q.targetId); return live(e) ? e : null; }
function turn(p, dx, dy) { const c = p.cube.corners; if (c.length >= 6) c.shift(); c.push({ x: p.x, y: p.y }); p.dx = dx; p.dy = dy; p.cube.dist = 0; p.cube.turns++; }
// Its foe for the way back: the nearest within `seek` that no sibling of its volley has claimed, else the nearest.
function seek(game, p) {
  const q = p.cube, O = ORRERY.cube; let best = null, bd = Infinity, any = null, ad = Infinity;
  for (const e of game.enemies) { if (!live(e)) continue; const d = Math.hypot(e.x + .5 - p.x, e.y + .45 - p.y); if (d > O.seek) continue; if (d < ad) { ad = d; any = e; }
    let claimed = false; for (const o of game.projectiles) if (o !== p && !o.dead && o.cube && o.cube.volley === q.volley && o.cube.targetId === e.id) { claimed = true; break; }
    if (!claimed && d < bd) { bd = d; best = e; } }
  q.targetId = (best || any)?.id || null;
}

// The projectile hit hook (game.ts updateProjectiles onHit): the combos.
export function orreryOnHit(game, p, e, now) {
  if (p.orrery === "cube") { p.combo = (p.combo || 0) + 1; if (p.combo === 1 && p.cube.phase === "out") { p.cube.phase = "over"; p.cube.dist = 0; } if (p.combo >= 2) p.dead = true; }
  else if (p.orrery === "clone" && !p.combo) { p.combo = 1; p.comboAt = p.age; p.firstId = e.id; p.speed = 0; }
}

// ---------------------------------------------------------------- rounds
// Rounds (Tim, 2026-11-11: "tools that fire should fire rounds... ordinary rounds are made automatically from cinder iron as you
// shoot... each shot costs 2 cinder iron, +1 per active Echo... empowered rounds are found around the corridor... used first
// and do more damage... with no cinder iron and no empowered rounds, the tool can't fire").
// - Which tools: the firing tools (`tools`, by their RANGED_WEAPONS name). Hammerfall and the Great Sweep are brawler blows
//   (melee), and so is the Sweep's Mirage of Blades: they take no rounds.
// - Each accepted shot takes one round: an empowered round while any are held (`empowered.perShot` each, whatever the Echoes),
//   else a round from the belt (`save.rounds.loaded`), else one made on the spot from `iron.base` cinder iron plus `iron.perEcho`
//   for each Echo glyph in the tool (counted up to `iron.echoCap`, the Echo shots a tool actually fires). With none of these
//   the shot is refused and the HUD says EMPTY. One press of the Blunderbuss is one round (its three pellets are one shell); an
//   Echo copy and an awakened fan ride on the round that fired them. The Aether Orrery takes one per tap orb and one per
//   charged great orb (its lasers, beams and pulses ride on those).
// - An empowered round multiplies the shot's damage by `empowered.damage` (every copy of it: pellets, Echoes, fan, clone). It
//   is a multiplier on the shot itself, so it composes with any global damage scale applied where shots land.
// - Finds (`finds`): a crossing chest (`dungeon`) and a great tree's crown, reached at its Crown Rest (`crown`), each hold
//   empowered rounds by chance, rolled by journey seed and place (version-pinned), and pay once (worldFlags). Other sources
//   call grantEmpoweredRounds(save, n): the hook for the world caches' loot tables.
// - `belt`: ordinary rounds a journey carries before it has to make any (a new journey, or one from before rounds). Saved as
//   save.rounds = { v, empowered, loaded, ...unknown } (additive at schema 14; ensureRounds from freshSave and migrateSave).
export const ROUNDS = {
  v: 1,
  tools: ["Spark Coil", "Lumen Spindle", "Needle Caster", "Blunderbuss", "Rift Bombard", "Aether Orrery"],
  iron: { base: 2, perEcho: 1, echoCap: 2 },
  empowered: { damage: 1.5, perShot: 1 },
  belt: 40,
  max: 999999,
  finds: { version: 1, dungeon: { chance: .12, n: [6, 12] }, crown: { chance: .35, n: [12, 24] } },
  messages: { empty: "Out of rounds: no empowered rounds and not enough cinder iron to make one", hud: "EMPTY" },
};
const ROUND_TOOLS = new Set(ROUNDS.tools);
const whole = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(ROUNDS.max, n)) : 0; };
export function ensureRounds(save) {
  if (!save || typeof save !== "object") return null;
  const raw = save.rounds && typeof save.rounds === "object" && !Array.isArray(save.rounds) ? save.rounds : null;
  save.rounds = raw ? { ...raw, v: ROUNDS.v, empowered: whole(raw.empowered), loaded: whole(raw.loaded) } : { v: ROUNDS.v, empowered: 0, loaded: ROUNDS.belt }; // unknown fields kept
  return save.rounds;
}
// Whether a tool's profile (items.ts rangedWeapon) fires rounds.
export const usesRounds = (weapon) => !!weapon && !weapon.brawlerTool && ROUND_TOOLS.has(weapon.name);
// The cinder iron one ordinary round takes with `echoes` Echo glyphs in the tool: 2, 3, 4.
export const roundIronCost = (echoes) => ROUNDS.iron.base + ROUNDS.iron.perEcho * Math.min(ROUNDS.iron.echoCap, whole(echoes));
const ironHeld = (save) => whole(save?.materials?.cinderIron);
// Echo glyphs socketed in the equipped tool (the HUD's count; a shot counts its own loadout).
export function toolEchoes(save) { const g = save?.equipment?.secondary?.glyphs; let n = 0; if (Array.isArray(g)) for (let i = 0; i < g.length; i++) if (g[i] === "echo") n++; return n; }
// Ordinary rounds ready to fire: the belt plus what the cinder iron held would make.
export const ordinaryRounds = (save, echoes) => whole(save?.rounds?.loaded) + Math.floor(ironHeld(save) / roundIronCost(echoes));
export const canFireRound = (save, echoes) => whole(save?.rounds?.empowered) >= ROUNDS.empowered.perShot || ordinaryRounds(save, echoes) > 0;
// Spend the round for one shot: "empowered", "ordinary", or null (nothing changed) when there is none. No allocation.
export function spendRound(save, echoes) {
  const r = save.rounds && typeof save.rounds === "object" ? save.rounds : ensureRounds(save);
  if (whole(r.empowered) >= ROUNDS.empowered.perShot) { r.empowered = whole(r.empowered) - ROUNDS.empowered.perShot; return "empowered"; }
  if (whole(r.loaded) > 0) { r.loaded = whole(r.loaded) - 1; return "ordinary"; }
  const cost = roundIronCost(echoes), iron = ironHeld(save); if (iron < cost) return null;
  save.materials.cinderIron = iron - cost; return "ordinary";
}
export const roundDamage = (kind) => kind === "empowered" ? ROUNDS.empowered.damage : 1;
// The hook for any source of empowered rounds (finds here; the world caches' loot tables later). Returns the count now held.
export function grantEmpoweredRounds(save, n) { const r = save.rounds && typeof save.rounds === "object" ? save.rounds : ensureRounds(save); r.empowered = whole(whole(r.empowered) + whole(n)); return r.empowered; }
// How many empowered rounds the find `source` at `key` holds (0: none). Pure: the same journey seed and place answer the same.
export function roundsFindRoll(seed, source, key) {
  const F = ROUNDS.finds[source]; if (!F?.n) return 0;
  const v = ROUNDS.finds.version; if ((hashSeed(`${seed}:rounds-find:v${v}:${source}:${key}`) % 10000) / 10000 >= F.chance) return 0;
  return F.n[0] + hashSeed(`${seed}:rounds-count:v${v}:${source}:${key}`) % (F.n[1] - F.n[0] + 1);
}
export const roundsFindFlag = (source, key) => `rounds-find:${source}:${key}`;
const shortCount = (n) => n >= 10000 ? `${Math.floor(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
// The tool button's compact count: "✦12·340" (empowered · ordinary), "340" with no empowered, "EMPTY" with none; null for a
// tool that takes no rounds.
export function roundsLabel(save, weapon) {
  if (!usesRounds(weapon)) return null; const e = whole(save?.rounds?.empowered), o = ordinaryRounds(save, toolEchoes(save));
  return e > 0 ? `✦${shortCount(e)}·${shortCount(o)}` : o > 0 ? shortCount(o) : ROUNDS.messages.hud;
}

// ---------------------------------------------------------------- drawing
const VIOLET = "#b9a6ff", TEAL = "#7ff3e6", CORE = "#f2eeff";
export function drawOrrery(ctx, game, toScreen, s, t, capture = null) {
  const S = game.orrery, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), q = game.presentation?.effectiveQuality || "balanced", now = game.lastUpdateNow || 0;
  const captureOrb=(source,radius,color)=>{
    if(!capture?.captureActor)return false;
    const rgb=Number.parseInt(color.slice(1),16);
    const accepted=capture.captureActor({source,x:source.x,y:source.y,lift:radius,height:Math.max(.5,radius*3),
      draw:(c,unit)=>orb(c,[source.x*unit,source.y*unit],unit*radius,color,true,false),
      sample:()=>({kind:'nativeOrb',x:source.x,y:source.y,lift:radius,radius,phase:0,pace:0,paletteMap:{[0xb9a6ff]:rgb},pose:'idle',amount:0})});
    if(accepted)orb(ctx,toScreen(source),s*radius,color,false);return accepted;
  };
  if (S?.charge && S.charge.held >= ORRERY.charge.grace) { // the cone of sparks
    const c = S.charge, [ox, oy] = toScreen(centre(game)), a0 = Math.atan2(c.dir.y, c.dir.x), N = ORRERY.sparks[q] ?? ORRERY.sparks.balanced, R = ORRERY.cone.range * s, H = ORRERY.cone.half, k = Math.min(1, c.held / ORRERY.charge.full), hot = c.held > ORRERY.charge.max - .5;
    ctx.fillStyle = hot ? "#ff9ad633" : "#b9a6ff22"; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, R, a0 - H, a0 + H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hot ? "#ffd1ee" : TEAL; ctx.beginPath();
    for (let i = 0; i < N; i++) { const u = still ? (i + .5) / N : ((i * .618 + t * 1.7) % 1), a = a0 + H * (((i * 7919) % 200) / 100 - 1) * .9, r = R * u, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r, z = 1.5 + 2 * (1 - u); ctx.moveTo(x + z, y); ctx.arc(x, y, z, 0, 7); }
    ctx.fill();
    ctx.strokeStyle = hot ? "#ff7ac0" : VIOLET; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, s * .55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.held / ORRERY.charge.max)); ctx.stroke(); void k;
  }
  const h = S?.halo;
  if (h) {
    if (S.charge && S.charge.held >= ORRERY.charge.grace && h.n >= 2) { // the triangle (or the beam)
      ctx.beginPath(); for (let i = 0; i < h.n; i++) { const [x, y] = toScreen(h.pts[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
      if (h.n >= 3) { ctx.fillStyle = "#7ff3e622"; ctx.fill(); } ctx.strokeStyle = TEAL; ctx.lineWidth = Math.max(2, s * .07); ctx.stroke();
    }
    for (let i = 0; i < h.n; i++) if(!captureOrb(h.pts[i],.13,VIOLET))orb(ctx, toScreen(h.pts[i]), s * .13, VIOLET);
  }
  const cp = S?.clonePt; if (cp && (cp.x || cp.y)) { if(!captureOrb(cp,.11,"#8f7ad8"))orb(ctx, toScreen(cp), s * .11, "#8f7ad8");
    if (S.charge && S.charge.held >= ORRERY.charge.grace) { const at = clonePlace(game, now); if (at) { const [ax, ay] = toScreen(centre(game)), [bx, by] = toScreen(at); ctx.strokeStyle = "#d7c9ff"; ctx.lineWidth = Math.max(2, s * .06); ctx.globalAlpha = still ? .8 : .6 + .3 * Math.sin(t * 20); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.globalAlpha = 1; } } }
  for (const p of game.projectiles) {
    if (p.dead || !p.orrery) continue; const [x, y] = toScreen(p);
    if (p.orrery === "orb") {if(!captureOrb(p,.17,VIOLET))orb(ctx, [x, y], s * .17, VIOLET);}
    else if (p.orrery === "pellet") { ctx.fillStyle = TEAL; ctx.globalAlpha = Math.min(1, p.life * 2); ctx.beginPath(); ctx.arc(x, y, s * .06, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (p.orrery === "big") { const R = s * (.3 + ORRERY.big.grow * .5); ctx.fillStyle = "#b9a6ff40"; ctx.beginPath(); ctx.arc(x, y, R * 1.6, 0, 7); ctx.fill(); if(!captureOrb(p,R/s,VIOLET))orb(ctx, [x, y], R, VIOLET); if (!still) { ctx.strokeStyle = TEAL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 1.2, t * 6, t * 6 + 2); ctx.stroke(); } }
    else { const L = s * (p.orrery === "drone" ? .35 : .5); ctx.strokeStyle = p.orrery === "drone" ? TEAL : p.orrery === "clone" ? "#d7c9ff" : CORE; ctx.lineWidth = Math.max(2, s * (p.orrery === "drone" ? .05 : .08));
      ctx.beginPath(); const tail = p.cube?.corners; if (tail?.length && !still) { const [cx, cy] = toScreen(tail[tail.length - 1]); ctx.moveTo(cx, cy); ctx.lineTo(x, y); } else { ctx.moveTo(x - p.dx * L, y - p.dy * L); ctx.lineTo(x, y); } ctx.stroke(); }
  }
  const lock = (game.orreryLockUntil || 0) - now; if (lock > 0) { const [x, y] = toScreen(centre(game)); ctx.strokeStyle = "#ff7ac0aa"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * .6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lock / (ORRERY.charge.lockout * 1000)); ctx.stroke(); }
}
function orb(ctx, [x, y], r, color,body=true,halo=true) { if(halo){ctx.fillStyle = color + "55"; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 7); ctx.fill();} if(!body)return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = CORE; ctx.beginPath(); ctx.arc(x, y, r * .45, 0, 7); ctx.fill(); }
