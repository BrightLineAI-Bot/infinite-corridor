// The Listener's walled form, reworked as the Morphling (release 385; Tim, 2026-10-24): "like one of the Night Lords from
// Elden Ring... more like Shub-Niggurath, the goat with a thousand young... it just keeps making things... it won't have one
// particular form... a big imposing, strong, muscular type thing. But when it attacks... its arms will shoot out like putty
// and turn into different forms... tentacles... cables... like Akira, at the end... It can do an attack where it shoots
// cables from itself in a bunch of different directions... across the entire [screen], and then its cables can ride
// back and forth... shoots its hand and it turns into a dragon mouth that clamps down... sink into the floor and then
// reappear at a different place... or come out through the walls... break off its tentacles to form worms... they try to
// come back to it. But if you get close to them, they'll do a little attack... spins around with his arm tentacles spread
// out... bounce around the screen... dives forward at you... a writhing mass of tentacles... you've closed all the
// relays... all his connections have been severed... consolidated into this one form".
//
// Every few seconds (`every`) the Morphling takes one of six moves (never the same twice running); between them it walks
// and strikes with its plain walled kit (the pack AI):
// - Cables: `cables.count` cables shoot out in every direction to the walls. After `telegraph` s a pulse rides each one
//   back and forth for `live` s; a pulse that reaches you hurts (jump it).
// - Jaw: an arm stretches to where you stand and opens into a dragon's mouth that clamps down after `reach` + `clamp` s.
// - Sink: it sinks into the floor (untouchable) and rises `near` tiles from you, often from beside a wall, in an eruption.
// - Worms: it tears off `worms.count` tentacles that fall as worms. They wriggle back to it (each one it takes back heals it
//   `worms.heal` of its health), nip you when you are close, and dry up after `worms.life` s. Kill them before they return.
// - Spin: arms spread, it spins and bounces around the hall off the walls for `spin.time` s (jump or dodge it).
// - Lunge: it rears, then dives along a line at you as a writhing wave of tentacles.
// - Beams, orbs and barbs (release 389): its ranged patterns, below.
// State is runtime only (e.morph on the actor); a reload starts the fight's rhythm again.
export const MORPH_FORM = {
  scale: 1.35, every: [2.2, 3.4], moves: ["cables", "jaw", "sink", "worms", "spin", "lunge", "beams", "orbs", "barbs"],
  // Release r389-7049a32777de (Tim: "a bunch of beams... I send out like 4 beams, and then they'll rotate around him... several orbs...
  // in a spiral pattern around him... come up with some convincing and unique ranged patterns"):
  // - Beams: four beams in a cross, shown thin for `telegraph` s, then live and turning round it at `turn` rad/s.
  // - Orbs: `arms` arms of orbs wound out in a spiral, one ring every `every` s for `time` s.
  // - Barbs: `volleys` fans of cable barbs that bend toward you for `homingUntil` s.
  beams: { count: 4, telegraph: .7, live: 3, length: 9, turn: 1.1, width: .5, damage: .6, hitEvery: .5 },
  orbs: { arms: 3, every: .11, time: 1.8, twist: 3.2, speed: 4.2, life: 3, damage: .45 },
  barbs: { volleys: 2, gap: .55, count: 5, spread: .95, speed: 6, life: 2.4, damage: .6, homing: 1.1, homingUntil: .8 },
  cables: { count: 8, telegraph: .8, live: 3.4, pulseSpeed: 8, width: .55, damage: .7, hitEvery: .6, length: 18 },
  jaw: { range: 8, reach: .65, clamp: .45, radius: 1.15, damage: 1.6, after: .35 },
  sink: { under: 1.3, near: [2.5, 4], erupt: 2.3, damage: 1 },
  worms: { count: [3, 5], max: 8, hp: .02, life: 14, speed: 1.7, spread: .6, spreadSpeed: 3.5, nipRange: 1.1, nip: .45, nipEvery: 1.2, heal: .015, rejoin: .75, scale: .42 },
  spin: { time: 3.2, speed: 6.5, radius: 1.35, damage: .9, hitEvery: .6 },
  lunge: { telegraph: .6, speed: 13, distance: 9, width: 1.5, damage: 1.5 },
};
const between = (r, [a, b]) => a + (b - a) * r;
const unit = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
const rand = (e, salt) => { const n = Math.sin((e.morph.seq = (e.morph.seq || 0) + 1) * 12.9898 + salt * 78.233) * 43758.5453; return n - Math.floor(n); };
export const isMorph = (e) => e?.farArrayBoss === "listener" && !e.dead && e.listenerPhase === "walled";
export const wormsOf = (enemies, e) => enemies.filter((q) => q.morphWorm && !q.dead && q.summonedBy === e.id);
const centre = (e) => ({ x: e.x + .5, y: e.y + .45 });
const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); };
// Where a cable from `a` along `d` meets a wall (or `max` tiles).
function castTo(w, a, d, max) { let s = .5; for (; s < max; s += .25) if (!w.open(a.x + d.x * s - .5, a.y + d.y * s - .45)) break; return { x: a.x + d.x * s, y: a.y + d.y * s, len: s }; }
// A cable's pulse position (0..1, back and forth).
export function pulseAt(c, now) { const p = ((now - c.liveAt) / 1000) * MORPH_FORM.cables.pulseSpeed / Math.max(1, c.len), f = p - 2 * Math.floor(p / 2); return f <= 1 ? f : 2 - f; }

// `w`: the mirror world (game.ts mirrorWorld) with `hurtAs(source, amount, { jumpable })` and `spawnWorm(owner, x, y, i, fields)`.
// Returns true while the Morphling moves itself this frame (the pack AI is skipped).
export function tickMorphListener(e, w) {
  const M = MORPH_FORM, now = w.now, dt = w.dt, st = (e.morph ||= { next: now + 1800, seq: 0 }), pc = { x: w.player.x + .5, y: w.player.y + .52 };
  if (!e.morphScaled) { e.scale = (e.scale || 1) * M.scale; e.bodyRadius = (e.bodyRadius || .5) * M.scale; e.morphScaled = true; }
  const dmg = (f) => Math.max(1, Math.round((Number(e.damage) || 10) * f));
  // Live cables keep their pulses running after the move ends.
  if (st.cables) {
    for (const c of st.cables) if (now >= c.liveAt && now < c.until && now >= (c.hitAt || 0)) { const f = pulseAt(c, now), at = { x: c.a.x + (c.b.x - c.a.x) * f, y: c.a.y + (c.b.y - c.a.y) * f }; if (Math.hypot(pc.x - at.x, pc.y - at.y) <= M.cables.width && w.hurtAs(e, dmg(M.cables.damage), { jumpable: true })) c.hitAt = now + M.cables.hitEvery * 1000; }
    if (st.cables.every((c) => now >= c.until)) st.cables = null;
  }
  if (!st.move) {
    if (now < st.next) return false;
    const ec = centre(e), far = Math.hypot(pc.x - ec.x, pc.y - ec.y), pool = M.moves.filter((m) => m !== st.last && !(m === "jaw" && far > M.jaw.range) && !(m === "worms" && wormsOf(w.enemies, e).length >= M.worms.max) && !(m === "cables" && st.cables));
    st.move = pool[Math.floor(rand(e, 1) * pool.length) % pool.length]; st.last = st.move; st.t0 = now;
    if (st.move === "cables") { const off = rand(e, 2) * Math.PI * 2; st.cables = Array.from({ length: M.cables.count }, (_, i) => { const a = off + i * Math.PI * 2 / M.cables.count, d = { x: Math.cos(a), y: Math.sin(a) }, end = castTo(w, ec, d, M.cables.length); return { a: { ...ec }, b: { x: end.x, y: end.y }, len: end.len, liveAt: now + M.cables.telegraph * 1000, until: now + (M.cables.telegraph + M.cables.live) * 1000, phase: i }; }); }
    if (st.move === "jaw") st.jaw = { from: ec, to: { ...pc }, clampAt: now + (M.jaw.reach + M.jaw.clamp) * 1000, bit: false };
    if (st.move === "sink") {
      let to = null;
      for (let k = 0; k < 12 && !to; k++) { const a = rand(e, 3) * Math.PI * 2, r = between(rand(e, 4), M.sink.near), x = pc.x + Math.cos(a) * r - .5, y = pc.y + Math.sin(a) * r - .45; if (w.open(x, y)) to = { x, y, wall: !w.open(x + Math.cos(a) * .9, y + Math.sin(a) * .9) }; }
      st.sink = { from: { x: e.x, y: e.y }, to: to || { x: e.x, y: e.y }, up: now + M.sink.under * 1000 }; e.untargetable = true; st.sunk = true;
    }
    if (st.move === "worms") {
      const n = Math.min(M.worms.max - wormsOf(w.enemies, e).length, Math.round(between(rand(e, 5), M.worms.count)));
      for (let i = 0; i < n; i++) { const a = rand(e, 6) * Math.PI * 2; w.spawnWorm(e, e.x, e.y, (st.worms = (st.worms || 0) + 1), { hpShare: M.worms.hp, lifeUntil: now + M.worms.life * 1000, spread: { x: Math.cos(a), y: Math.sin(a), until: now + M.worms.spread * 1000 } }); }
      st.moveUntil = now + 700;
    }
    if (st.move === "spin") { const d = unit(pc.x - ec.x, pc.y - ec.y); st.spin = { vx: d.x, vy: d.y, until: now + M.spin.time * 1000, hitAt: 0 }; }
    if (st.move === "lunge") { const d = unit(pc.x - ec.x, pc.y - ec.y); st.lunge = { dir: d, from: ec, goAt: now + M.lunge.telegraph * 1000, gone: 0, hit: false }; }
    if (st.move === "beams") st.beams = { a0: rand(e, 8) * Math.PI * 2, turn: rand(e, 9) < .5 ? -1 : 1, liveAt: now + M.beams.telegraph * 1000, until: now + (M.beams.telegraph + M.beams.live) * 1000, hitAt: 0 };
    if (st.move === "orbs") st.orbs = { a: Math.atan2(pc.y - ec.y, pc.x - ec.x), nextAt: now, until: now + M.orbs.time * 1000, ring: 0 };
    if (st.move === "barbs") st.barbs = { fired: 0 };
  }
  const done = () => { st.move = null; st.jaw = st.sink = st.spin = st.lunge = st.beams = st.orbs = st.barbs = null; st.next = now + between(rand(e, 7), M.every) * 1000; return false; };
  switch (st.move) {
    case "cables": if (now >= st.t0 + (M.cables.telegraph + .4) * 1000) return done(); return true;
    case "jaw": { const j = st.jaw; if (!j.bit && now >= j.clampAt) { j.bit = true; if (Math.hypot(pc.x - j.to.x, pc.y - j.to.y) <= M.jaw.radius) w.hurtAs(e, dmg(M.jaw.damage), {}); } if (now >= j.clampAt + M.jaw.after * 1000) return done(); return true; }
    case "sink": { const s = st.sink, k = Math.min(1, (now - st.t0) / (M.sink.under * 1000)); e.x = s.from.x + (s.to.x - s.from.x) * k; e.y = s.from.y + (s.to.y - s.from.y) * k;
      if (now >= s.up) { e.untargetable = false; st.sunk = false; w.shock(e, M.sink.erupt, dmg(M.sink.damage)); return done(); } return true; }
    case "worms": if (now >= st.moveUntil) return done(); return true;
    case "spin": { const s = st.spin, step = M.spin.speed * dt; let x = e.x + s.vx * step, y = e.y + s.vy * step;
      if (!w.open(x, y)) { if (w.open(e.x - s.vx * step, y)) { s.vx = -s.vx; x = e.x + s.vx * step; } else if (w.open(x, e.y - s.vy * step)) { s.vy = -s.vy; y = e.y + s.vy * step; } else { s.vx = -s.vx; s.vy = -s.vy; x = e.x; y = e.y; } }
      if (w.open(x, y)) { e.x = x; e.y = y; }
      const c = centre(e); if (now >= s.hitAt && Math.hypot(pc.x - c.x, pc.y - c.y) <= M.spin.radius && w.hurtAs(e, dmg(M.spin.damage), { jumpable: true })) s.hitAt = now + M.spin.hitEvery * 1000;
      if (now >= s.until) return done(); return true; }
    case "lunge": { const l = st.lunge; if (now < l.goAt) return true;
      const step = M.lunge.speed * dt, x = e.x + l.dir.x * step, y = e.y + l.dir.y * step;
      if (l.gone >= M.lunge.distance || !w.open(x, y)) return done();
      e.x = x; e.y = y; l.gone += step;
      if (!l.hit && segDist(pc, centre(e), { x: centre(e).x - l.dir.x * 1.2, y: centre(e).y - l.dir.y * 1.2 }) <= M.lunge.width / 2 + .3) { l.hit = true; w.hurtAs(e, dmg(M.lunge.damage), {}); }
      return true; }
    case "beams": { const b = st.beams; if (now >= b.until) return done(); if (now < b.liveAt) return true;
      const c = centre(e);
      for (let i = 0; i < M.beams.count; i++) { const a = beamAngle(b, i, now), end = { x: c.x + Math.cos(a) * M.beams.length, y: c.y + Math.sin(a) * M.beams.length }; if (now >= b.hitAt && segDist(pc, c, end) <= M.beams.width && w.hurtAs(e, dmg(M.beams.damage), {})) b.hitAt = now + M.beams.hitEvery * 1000; }
      return true; }
    case "orbs": { const o = st.orbs; if (now >= o.until) return done();
      while (now >= o.nextAt && now < o.until) { const c = centre(e); o.ring++; o.a += M.orbs.twist * M.orbs.every;
        for (let i = 0; i < M.orbs.arms; i++) { const a = o.a + i * Math.PI * 2 / M.orbs.arms; w.projectiles.push({ id: `${e.id}:orb:${Math.round(o.nextAt)}:${i}`, x: c.x + Math.cos(a) * .6, y: c.y + Math.sin(a) * .6, dx: Math.cos(a), dy: Math.sin(a), speed: M.orbs.speed, life: M.orbs.life, damage: dmg(M.orbs.damage), hostile: true, path: "straight", age: 0, hits: {}, morphOrb: true }); }
        o.nextAt += M.orbs.every * 1000; }
      return true; }
    case "barbs": { const b = st.barbs, B = M.barbs;
      while (b.fired < B.volleys && now >= st.t0 + b.fired * B.gap * 1000) { const c = centre(e), aim = Math.atan2(pc.y - c.y, pc.x - c.x) + (b.fired % 2 ? B.spread / (B.count * 2) : 0);
        for (let i = 0; i < B.count; i++) { const a = aim + (i - (B.count - 1) / 2) * B.spread / (B.count - 1); w.projectiles.push({ id: `${e.id}:barb:${b.fired}:${i}:${Math.round(now)}`, x: c.x + Math.cos(a) * .7, y: c.y + Math.sin(a) * .7, dx: Math.cos(a), dy: Math.sin(a), speed: B.speed, life: B.life, damage: dmg(B.damage), hostile: true, path: "straight", age: 0, hits: {}, homingTurnRate: B.homing, homingUntil: B.homingUntil, morphBarb: true }); }
        b.fired++; }
      if (now >= st.t0 + ((B.volleys - 1) * B.gap + .4) * 1000) return done(); return true; }
  }
  return done();
}
// The angle of beam `i` at `now` (shared with the renderer).
export const beamAngle = (b, i, now) => b.a0 + i * Math.PI * 2 / MORPH_FORM.beams.count + b.turn * MORPH_FORM.beams.turn * Math.max(0, now - b.liveAt) / 1000;

// A worm's own turn. Always moves itself (returns true).
export function tickWorm(c, w) {
  const M = MORPH_FORM.worms, now = w.now, owner = w.enemies.find((q) => q.id === c.summonedBy);
  if (now >= c.lifeUntil || !owner || owner.dead) { c.dead = true; c.faded = true; return true; }
  const pc = { x: w.player.x + .5, y: w.player.y + .52 }, me = centre(c);
  if (c.spread && now < c.spread.until) { const step = M.spreadSpeed * w.dt, x = c.x + c.spread.x * step, y = c.y + c.spread.y * step; if (w.open(x, y)) { c.x = x; c.y = y; } else c.spread.until = 0; return true; }
  if (Math.hypot(pc.x - me.x, pc.y - me.y) <= M.nipRange && now >= (c.nipAt || 0)) { c.nipAt = now + M.nipEvery * 1000; c.nipUntil = now + 250; w.hurtAs(c, Math.max(1, Math.round((Number(owner.damage) || 10) * M.nip)), {}); }
  if (owner.morph?.sunk) return true; // it waits while its body is under the floor
  const oc = centre(owner), d = Math.hypot(oc.x - me.x, oc.y - me.y);
  if (d <= M.rejoin + (owner.bodyRadius || .5) * .5) { c.dead = true; c.faded = true; c.rejoined = true; owner.hp = Math.min(owner.maxHp, owner.hp + owner.maxHp * M.heal); return true; }
  const u = unit(oc.x - me.x, oc.y - me.y), step = M.speed * w.dt, wig = Math.sin(now / 90 + (c.seed || 1)) * .6, x = c.x + (u.x - u.y * wig) * step, y = c.y + (u.y + u.x * wig) * step;
  if (w.open(x, y)) { c.x = x; c.y = y; } else if (w.open(c.x + u.x * step, c.y + u.y * step)) { c.x += u.x * step; c.y += u.y * step; }
  c.facing = u; return true;
}
