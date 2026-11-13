// Awakened arts (Tim, 2026-11-13: one unique awakened move per weapon, in place of the shared crescent; each upgrades its
// weapon's own art when that art is selected too). Every number is in weapon-arts.ts AWAKENED_ARTS; this module runs them in
// game.awakenedArts (runtime only, never saved). game.ts calls:
// - awakenedSwing at every third accepted swing of an awakened primary (where the crescent was): the Verge Cleaver's Fissure,
//   the Fourfold Daggers' Returning blades, the Cinder Pike's Lance, the Salvage Blade's Spell runes;
// - awakenedKickBurst for the Iron Fists' fourth strike (game.ts awakenedKick, after the uppercut while the combo is open);
// - awakenedArtRelease from weapon-arts.ts (Blade Stream's ring of blades; the uppercut Ki Blast's axe kick on landing);
// - runeStruck when a spell strikes a foe (game.ts, both the shot and the effect paths), awakenedSpellCast when a spell is cast
//   (Transpose's seal pulse), and tickAwakenedArts every frame.
// Physical weapons stay physical: every blow goes through game.artBlow (the melee glyphs, glyphHit, the Wayfarer's damage
// scale); foes that hold their ground (WEAPON_ARTS.anchored) take the blow but are never knocked. Bounded: fixed pools made
// once and reused (the oldest gives way when full), nothing allocated per frame. A reload drops all of it; a new area drops
// what is in play; a rune's foe gone drops the rune. Reduced motion and safe mode stop the turning and pulsing.
import { AWAKENED_ARTS, WEAPON_ARTS, awakenedFor, awakenedUp } from "./weapon-arts.js?v=r942-f19bda103f46";

const M = AWAKENED_ARTS.moves, P = AWAKENED_ARTS.pools;
const enemyBodyRadius = (e) => Math.max(.28, Number(e?.bodyRadius) || .38); // combat.ts enemyBodyRadius, restated (a leaf)
const hittable = (e) => !!e && !e.dead && !e.untargetable && !e.hidden && e.kind !== "npc" && Number(e.hp) > 0;
const extra = (e) => Math.max(0, enemyBodyRadius(e) - .38);
const centre = (game) => ({ x: game.player.x + .5, y: game.player.y + .45 });
const fx = (e) => e.x + .5, fy = (e) => e.y + .45;

// ---------------------------------------------------------------- runtime state (game.awakenedArts, never saved)
const hitList = () => Array.from({ length: P.hits }, () => "");
export function awakenedArtsState(game) {
  return (game.awakenedArts ||= {
    where: typeof game.orreryWhere === "function" ? game.orreryWhere() : "", // made where it is first used: only a later change of area clears it
    fissures: Array.from({ length: P.fissures }, () => ({ on: false, lava: false, up: false, x0: 0, y0: 0, x1: 0, y1: 0, wait: 0, left: 0, tick: 0, power: 0, age: 0 })),
    blades: Array.from({ length: P.blades }, () => ({ on: false, ring: false, back: false, x: 0, y: 0, dx: 1, dy: 0, left: 0, speed: 0, power: 0, n: 0, hit: hitList(), age: 0 })),
    lances: Array.from({ length: P.lances }, () => ({ life: 0, x0: 0, y0: 0, x1: 0, y1: 0 })),
    runes: Array.from({ length: P.runes }, () => ({ on: false, foe: null, left: 0, power: 0, pop: false, age: 0 })),
    axes: Array.from({ length: P.axes }, () => ({ on: false, wait: 0, power: 0, record: null })), // record: the uppercut's attack record
    flashes: Array.from({ length: P.flashes }, () => ({ life: 0, max: 1, kind: "", x: 0, y: 0, r: 0 })),
    pulse: { queued: false, at: -Infinity, x: 0, y: 0, r: 0, power: 0 },
  });
}
export function clearAwakenedArts(game) {
  const K = game.awakenedArts; if (!K) return;
  for (const f of K.fissures) f.on = false; for (const b of K.blades) b.on = false; for (const l of K.lances) l.life = 0;
  for (const r of K.runes) { r.on = false; r.foe = null; r.pop = false; } for (const a of K.axes) { a.on = false; a.record = null; } for (const f of K.flashes) f.life = 0;
  K.pulse.queued = false;
}
// Live counts (tests, the HUD-free check that nothing piles up).
export function liveAwakened(game) {
  const K = game.awakenedArts, n = { fissures: 0, blades: 0, lances: 0, runes: 0, axes: 0 }; if (!K) return n;
  for (const f of K.fissures) if (f.on) n.fissures++; for (const b of K.blades) if (b.on) n.blades++; for (const l of K.lances) if (l.life > 0) n.lances++;
  for (const r of K.runes) if (r.on) n.runes++; for (const a of K.axes) if (a.on) n.axes++; return n;
}
export const runeOn = (game, e) => { for (const r of game.awakenedArts?.runes || []) if (r.on && r.foe === e) return true; return false; };

function oldest(list, live, age) { let slot = list[0]; for (const q of list) { if (!live(q)) return q; if (age(q) > age(slot)) slot = q; } return slot; }
function flash(K, kind, x, y, r, life = AWAKENED_ARTS.flash.life) {
  const f = oldest(K.flashes, (q) => q.life > 0, (q) => -q.life); f.life = life; f.max = life; f.kind = kind; f.x = x; f.y = y; f.r = r;
}
// The distance from (px, py) to the segment (x0, y0)-(x1, y1), and the nearest point on it (written to `at`).
const AT = { x: 0, y: 0 };
function toSegment(px, py, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0, L = vx * vx + vy * vy, t = L > 1e-9 ? Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / L)) : 0;
  AT.x = x0 + vx * t; AT.y = y0 + vy * t; return Math.hypot(px - AT.x, py - AT.y);
}
// How far a line from (x, y) along (dx, dy) runs before a wall, up to `length` (quarter-tile steps).
function reach(game, x, y, dx, dy, length) { let d = 0; while (d + .25 <= length + 1e-9 && game.artOpen(x + dx * (d + .25), y + dy * (d + .25))) d += .25; return d; }
// Every foe within `width` of the segment takes `amount`; knocked away from its nearest point (or along `kx, ky`).
function strikeLine(game, x0, y0, x1, y1, width, amount, now, stun, knock) {
  let n = 0; for (const e of game.enemies) {
    if (!hittable(e) || toSegment(fx(e), fy(e), x0, y0, x1, y1) > width + extra(e)) continue;
    game.artBlow(e, amount, now, stun, AT.x, AT.y, knock); n++;
  } return n;
}
function burst(game, x, y, r, amount, now, stun, knock) {
  let n = 0; for (const e of game.enemies) if (hittable(e) && Math.hypot(fx(e) - x, fy(e) - y) <= r + extra(e)) { game.artBlow(e, amount, now, stun, x, y, knock); n++; }
  return n;
}

// ---------------------------------------------------------------- the moves
// The third swing of an awakened primary (game.ts primaryAttack, where the crescent was). `d`: the swing's aim; `hit`: a normal
// hit of the weapon (the crescent's base); `struck`: the foes the swing struck. False: no awakened move of its own (the caller
// keeps the crescent).
export function awakenedSwing(game, now, d, hit, struck = null) {
  const id = awakenedFor(game.save); if (!id || id === "roundhouse") return false;
  const K = awakenedArtsState(game), A = M[id], c = centre(game), power = Math.max(0, Number(hit) || 0);
  if (id === "fissure") {
    const x0 = c.x + d.x * A.start, y0 = c.y + d.y * A.start, L = reach(game, x0, y0, d.x, d.y, A.length), F = oldest(K.fissures, (q) => q.on, (q) => q.age);
    F.on = true; F.lava = false; F.up = awakenedUp(game.save, id); F.x0 = x0; F.y0 = y0; F.x1 = x0 + d.x * L; F.y1 = y0 + d.y * L; F.wait = A.delay; F.left = 0; F.tick = 0; F.power = power; F.age = 0;
  } else if (id === "returning-blades") throwBlade(K, false, c.x + d.x * .4, c.y + d.y * .4, d.x, d.y, A.range, A.speed, power * A.share);
  else if (id === "lance") {
    const x0 = c.x + d.x * A.start, y0 = c.y + d.y * A.start, L = reach(game, x0, y0, d.x, d.y, A.length), x1 = x0 + d.x * L, y1 = y0 + d.y * L;
    strikeLine(game, x0, y0, x1, y1, A.width, power * A.share, now, A.stun, A.knock);
    const l = oldest(K.lances, (q) => q.life > 0, (q) => -q.life); l.life = A.life; l.x0 = x0; l.y0 = y0; l.x1 = x1; l.y1 = y1;
  } else if (id === "spell-runes") { // Tim, 2026-11-13: one rune a third swing, on the nearest struck foe not yet runed (so a crowd fills up); all runed: refresh the nearest
    let best = null, bestD = Infinity, near = null, nearD = Infinity;
    if (struck) for (const e of struck) { if (!e || e.kind === "npc" || !hittable(e)) continue; const q = (fx(e) - c.x) ** 2 + (fy(e) - c.y) ** 2; if (q < nearD) { nearD = q; near = e; } if (!runeOn(game, e) && q < bestD) { bestD = q; best = e; } }
    const e = best || near; if (e) mark(K, e, power);
  }
  game.awakenedVisual?.(now, d, id, A.poseMs);
  return true;
}
function throwBlade(K, ring, x, y, dx, dy, range, speed, power) {
  const b = oldest(K.blades, (q) => q.on, (q) => q.age);
  b.on = true; b.ring = ring; b.back = false; b.x = x; b.y = y; b.dx = dx; b.dy = dy; b.left = range; b.speed = speed; b.power = power; b.n = 0; b.age = 0;
  for (let i = 0; i < b.hit.length; i++) b.hit[i] = "";
}
function mark(K, e, power) {
  let r = null; for (const q of K.runes) if (q.on && q.foe === e) { r = q; break; } // a foe holds one rune: a new mark refreshes it
  r ||= oldest(K.runes, (q) => q.on, (q) => q.age);
  r.on = true; r.foe = e; r.left = M["spell-runes"].life; r.power = power; r.pop = false; r.age = 0;
}
// The Iron Fists' awakened fourth strike: every foe within `radius` of the Wayfarer, knocked away from her.
export function awakenedKickBurst(game, now, power) {
  const A = M.roundhouse, K = awakenedArtsState(game), c = centre(game);
  const n = burst(game, c.x, c.y, A.radius, Math.max(0, Number(power) || 0) * A.share, now, A.stun, A.knock);
  flash(K, "kick", c.x, c.y, A.radius, AWAKENED_ARTS.flash.kick); return n;
}
// An art released (weapon-arts.ts): Blade Stream with awakened Fourfold Daggers throws the ring; the airborne Ki Blast with
// awakened Iron Fists waits for the landing and drops an axe kick.
export function awakenedArtRelease(game, id, now, air = false) {
  if (id === "blade-stream" && awakenedUp(game.save, "returning-blades")) {
    const K = awakenedArtsState(game), U = M["returning-blades"].up, c = centre(game), power = Math.max(0, Number(game.artPower(now)) || 0) * U.share;
    for (let i = 0; i < U.count; i++) { const a = i * Math.PI * 2 / U.count; throwBlade(K, true, c.x, c.y, Math.cos(a), Math.sin(a), U.range, U.speed, power); }
    return true;
  }
  if (id === "ki-blast" && air && awakenedUp(game.save, "roundhouse")) {
    const K = awakenedArtsState(game), U = M.roundhouse.up, a = K.axes[0];
    a.on = true; a.wait = Math.min(U.wait, Math.max(0, ((Number(game.jumpUntil) || 0) - now) / 1000)); a.power = Math.max(0, Number(game.artPower(now)) || 0) * U.share; a.record = game.player?.attackVisual || null;
    return true;
  }
  return false;
}
// A spell struck `e` (game.ts): its rune bursts on the next frame (never inside the spell's own hit loop).
export function runeStruck(game, e) { const K = game.awakenedArts; if (!K || !e) return false; for (const r of K.runes) if (r.on && r.foe === e) { r.pop = true; return true; } return false; }
// A spell was cast (game.ts castSpell): standing in Transpose's seal with awakened Salvage Blade, the seal pulses.
export function awakenedSpellCast(game, now) {
  if (!awakenedUp(game.save, "spell-runes")) return false;
  const S = game.weaponArts?.seal, R = WEAPON_ARTS.arts.transpose.radius, p = game.player; if (!S?.on || Math.hypot(p.x + .5 - S.x, p.y + .45 - S.y) > R) return false;
  const K = awakenedArtsState(game), Q = K.pulse, U = M["spell-runes"].up; if (Q.queued || now - Q.at < U.gap * 1000) return false;
  Q.queued = true; Q.at = now; Q.x = S.x; Q.y = S.y; Q.r = R; Q.power = Math.max(0, Number(game.artPower(now)) || 0) * U.share; return true;
}

// ---------------------------------------------------------------- the frame
export function tickAwakenedArts(game, dt, now) {
  const K = game.awakenedArts; if (!K) return;
  if (!(dt >= 0) || !Number.isFinite(dt)) dt = 0;
  const where = game.orreryWhere(); if (K.where !== where) { clearAwakenedArts(game); K.where = where; }
  for (const f of K.flashes) if (f.life > 0) f.life = Math.max(0, f.life - dt);
  for (const l of K.lances) if (l.life > 0) l.life = Math.max(0, l.life - dt);
  const FA = M.fissure;
  for (const F of K.fissures) {
    if (!F.on) continue; F.age += dt;
    if (!F.lava) {
      if ((F.wait -= dt) > 0) continue;
      strikeLine(game, F.x0, F.y0, F.x1, F.y1, FA.width, F.power * FA.share, now, FA.stun, FA.knock);
      flash(K, "erupt", (F.x0 + F.x1) / 2, (F.y0 + F.y1) / 2, Math.hypot(F.x1 - F.x0, F.y1 - F.y0) / 2 + FA.width);
      if (F.up) { F.lava = true; F.left = FA.up.life; F.tick = FA.up.tick; } else F.on = false;
    } else {
      F.left -= dt; F.tick -= dt;
      while (F.tick <= 0 && F.left > -1e-9) { strikeLine(game, F.x0, F.y0, F.x1, F.y1, FA.width, F.power * FA.up.share, now, 0, 0); F.tick += FA.up.tick; }
      if (F.left <= 0) F.on = false;
    }
  }
  for (const b of K.blades) if (b.on) tickBlade(game, b, dt, now);
  for (const r of K.runes) {
    if (!r.on) continue; r.age += dt;
    if (!hittable(r.foe)) { r.on = false; r.foe = null; continue; } // its foe is gone
    if (r.pop) { const e = r.foe, x = fx(e), y = fy(e), A = M["spell-runes"]; r.on = false; r.foe = null; r.pop = false; burst(game, x, y, A.burst, r.power * A.share, now, A.stun, 0); flash(K, "rune", x, y, A.burst); continue; }
    if ((r.left -= dt) <= 0) { r.on = false; r.foe = null; }
  }
  for (const a of K.axes) {
    if (!a.on) continue;
    if (!(game.player.hp > 0)) { a.on = false; a.record = null; continue; }
    if ((a.wait -= dt) > 0) continue;
    const U = M.roundhouse.up, c = centre(game), mine = a.record, current = game.player.attackVisual; a.on = false; a.record = null;
    if (awakenedFor(game.save) !== "roundhouse" || current !== mine) continue; // the fists put away, or a newer action since the uppercut: dropped
    burst(game, c.x, c.y, U.radius, a.power, now, U.stun, U.knock); flash(K, "axe", c.x, c.y, U.radius, AWAKENED_ARTS.flash.kick);
    game.awakenedVisual?.(now, null, "axe-kick", U.poseMs); game.message = AWAKENED_ARTS.messages.axe;
  }
  const Q = K.pulse;
  if (Q.queued) { Q.queued = false; burst(game, Q.x, Q.y, Q.r, Q.power, now, 0, 0); flash(K, "pulse", Q.x, Q.y, Q.r); }
}
const wasHit = (b, id) => { for (let i = 0; i < b.n; i++) if (b.hit[i] === id) return true; return false; };
function tickBlade(game, b, dt, now) {
  const A = M["returning-blades"], step = WEAPON_ARTS.view.step; b.age += dt;
  if (b.age > (A.range * 2 + 2) / Math.max(1, b.speed) + 1) { b.on = false; return; } // a lost blade never lingers
  const dist = Math.min(b.back ? b.speed * dt : b.left, b.speed * dt), n = Math.max(1, Math.ceil(dist / step)), d = dist / n;
  for (let i = 0; i < n; i++) {
    if (b.back) { const c = centre(game), hx = c.x - b.x, hy = c.y - b.y, hd = Math.hypot(hx, hy); if (hd <= .45) { b.on = false; return; } b.dx = hx / hd; b.dy = hy / hd; }
    const nx = b.x + b.dx * d, ny = b.y + b.dy * d;
    if (!game.artOpen(nx, ny)) { if (b.back) { b.on = false; return; } turn(b); continue; } // out: a wall turns it; home: a wall ends it
    b.x = nx; b.y = ny; if (!b.back) b.left -= d;
    for (const e of game.enemies) {
      if (b.n >= b.hit.length || !hittable(e) || wasHit(b, e.id) || Math.hypot(fx(e) - b.x, fy(e) - b.y) >= A.radius + enemyBodyRadius(e)) continue;
      b.hit[b.n++] = e.id; game.artBlow(e, b.power, now, A.stun, b.x - b.dx, b.y - b.dy, 0);
    }
    if (!b.back && b.left <= 1e-6) turn(b);
  }
}
function turn(b) { b.back = true; b.n = 0; for (let i = 0; i < b.hit.length; i++) b.hit[i] = ""; }

// ---------------------------------------------------------------- presentation (standard view; Close View draws it on the floor)
export function drawAwakenedArts(ctx, game, toScreen, s, t) {
  const K = game.awakenedArts; if (!K) return;
  const C = AWAKENED_ARTS.colors, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode);
  ctx.save(); try {
    ctx.lineCap = "round";
    for (const F of K.fissures) { if (!F.on) continue; const [x0, y0] = toScreen({ x: F.x0, y: F.y0 }), [x1, y1] = toScreen({ x: F.x1, y: F.y1 }), nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
      ctx.globalAlpha = .9; ctx.strokeStyle = C.crack; ctx.lineWidth = Math.max(2, s * .1); ctx.beginPath(); ctx.moveTo(x0, y0); // a jagged crack
      for (let i = 1; i <= 6; i++) { const k = i / 6, j = (i % 2 ? 1 : -1) * s * .09 * (i < 6 ? 1 : 0); ctx.lineTo(x0 + (x1 - x0) * k + nx / nl * j, y0 + (y1 - y0) * k + ny / nl * j); } ctx.stroke();
      const glow = F.lava ? Math.min(1, F.left / .5) * (still ? .8 : .6 + .3 * Math.sin(t * 9 + F.age * 4)) : .25 + .6 * (1 - Math.max(0, F.wait) / M.fissure.delay);
      ctx.globalAlpha = glow; ctx.strokeStyle = F.lava ? C.fissure : C.fissureCore; ctx.lineWidth = Math.max(1.5, s * (F.lava ? .12 : .04)); ctx.stroke(); }
    for (const l of K.lances) { if (!(l.life > 0)) continue; const k = l.life / M.lance.life, grow = still ? 1 : Math.min(1, (1 - k) / .25 + .2), [x0, y0] = toScreen({ x: l.x0, y: l.y0 }), [x1, y1] = toScreen({ x: l.x0 + (l.x1 - l.x0) * grow, y: l.y0 + (l.y1 - l.y0) * grow });
      ctx.globalAlpha = .45 * k; ctx.strokeStyle = C.lance; ctx.lineWidth = Math.max(4, s * M.lance.width * 1.2); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = k; ctx.strokeStyle = C.lanceCore; ctx.lineWidth = Math.max(2, s * .08); ctx.stroke(); }
    for (const b of K.blades) { if (!b.on) continue; const [x, y] = toScreen(b), spin = still ? 0 : b.age * 24, r = s * (b.ring ? .22 : .26);
      for (let k = 0; k < (b.ring ? 1 : 2); k++) { const a = spin + k * Math.PI, ox = b.ring ? 0 : -b.dy * s * .14 * (k ? 1 : -1), oy = b.ring ? 0 : b.dx * s * .14 * (k ? 1 : -1);
        ctx.globalAlpha = 1; ctx.strokeStyle = C.blade; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.moveTo(x + ox - Math.cos(a) * r, y + oy - Math.sin(a) * r); ctx.lineTo(x + ox + Math.cos(a) * r, y + oy + Math.sin(a) * r); ctx.stroke();
        ctx.globalAlpha = .35; ctx.strokeStyle = C.bladeEdge; ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 7); ctx.stroke(); } }
    for (const r of K.runes) { if (!r.on || !r.foe) continue; const [x, y] = toScreen({ x: fx(r.foe), y: fy(r.foe) - .75 }), R = s * .2, a = still ? 0 : r.age * 2, fade = Math.min(1, r.left / 1.5, r.age / .15);
      ctx.globalAlpha = .9 * fade; ctx.strokeStyle = C.rune; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
      ctx.strokeStyle = C.runeCore; ctx.beginPath(); for (let i = 0; i < 3; i++) { const q = a + i * Math.PI * 2 / 3; ctx.moveTo(x + Math.cos(q) * R * .8, y + Math.sin(q) * R * .8); ctx.lineTo(x - Math.cos(q) * R * .4, y - Math.sin(q) * R * .4); } ctx.stroke(); }
    for (const f of K.flashes) { if (!(f.life > 0)) continue; const k = f.life / f.max, [x, y] = toScreen(f), R = f.r * s * (still ? 1 : 1.1 - .25 * k);
      const col = f.kind === "erupt" ? C.fissure : f.kind === "rune" ? C.rune : f.kind === "pulse" ? C.pulse : C.kick, core = f.kind === "erupt" ? C.fissureCore : f.kind === "rune" ? C.runeCore : f.kind === "pulse" ? C.runeCore : C.kickCore;
      ctx.globalAlpha = .35 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.globalAlpha = k; ctx.strokeStyle = core; ctx.lineWidth = Math.max(2, s * .08 * k); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
      if (f.kind === "kick" && !still) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.arc(x, y, R * .7, t * 14, t * 14 + 2.4); ctx.stroke(); } }
  } finally { ctx.restore(); }
}
