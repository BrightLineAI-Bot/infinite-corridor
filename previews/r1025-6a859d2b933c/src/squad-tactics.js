// Squad tactics for ordinary creatures (Tim, 2026-11-15: "better AI... for attack and coordination... they can work together
// and use their strengths... more coordinated... not just dumb creatures"; then, the same day, the difficulty: Bloodborne-style
// mobs, "easy to slaughter one at a time, but once activated they get on you and swarm you... not scared of you", two blows
// may land at once and a "wombo combo" is allowed when you are caught out of position, "it shouldn't be an easy game"; fair
// means readable and avoidable, not gentle).
//
// A layer on the release-975 squad board (enemy-behaviour.ts createSquad: awareness, tokens, rings, blows, reactions). An
// activated group commits as a team, with a role that comes from each family's strengths (TACTICS, data in the BEHAVIOUR style):
//   front    brutes and humanoids hold the side the squad faces the Wayfarer from, close in, and press
//   flank    beasts take the Wayfarer's sides and back (a pincer) and strike when the Wayfarer is busy with another, when they
//            stand in their place, or in any punish window; with no front line they surround evenly
//   swarm    brood get on the Wayfarer: a tight ring, spread evenly, with a place turned into the lane it runs for
//   ranged   casters keep their distance in the gaps behind the front line, check their line of fire for kin (no shot through
//            a friend: they sidestep and hold that shot), and fall back behind a healthy front-liner once when badly hurt
// and, for every role:
//   surround more blows at once: the token caps grow with the group past the release-975 caps (TACTICS.tokens; never below;
//            behind the TACTICS.surround switch, off until the 975 token test is updated)
//   combo    up to TACTICS.hurt.stack blows from an activated pack land together, then a short hurt window (tacticsHurtWindow)
//   pressure shorter rests between blows (TACTICS.aggression.rest); punish windows (the Wayfarer deep in a swing, just out of a
//            dodge, drinking) cut a rest outright
//   courage  a melee creature with its pack about it never takes the release-975 coward's retreat: it presses until it dies
//            (a lone one still may; casters fall back behind a healthy front-liner)
// Fairness is readable and avoidable, not gentle: no windup is ever shortened, blows from different attackers may land
// together, and a blow from behind the Wayfarer's facing (where a close camera cannot see it) gets a longer tell
// (TACTICS.tell). Ranged roles hold within TACTICS.roles.ranged.band, so nothing shoots from off-screen.
//
// Without a squad board, or with `board.tac` null, nothing here runs. Nothing is saved: the per-creature record lives on the
// non-enumerable `e.bhv` (as `bhv.tac`) and is re-derived after a load; all choices are ordered by position and stable ids (no
// Math.random). Per frame: O(active creatures), a bounded rank within each role (TACTICS.rankCap), a lane check per ranged
// creature every TACTICS.roles.ranged.laneEvery s, and no allocation after the board is made.
import { behaviourProfile, holdsToken, BEHAVIOUR } from "./enemy-behaviour.js?v=r1025-6a859d2b933c";

export const TACTICS_VERSION = 2;
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- the table
// Role fields:
//   band        share of the family's ring (front and flank: closer in)
//   steer       how hard it walks round the ring to its place (share of its closing pace per radian of error)
//   place       degrees of error at which it stands in its place
//   spread      front: degrees between neighbours, `max` the usual widest (`wide` for a long line); flank: `from` degrees off the squad's front to 180
//   patience    flank: seconds out of place, with the Wayfarer free, before it strikes anyway
//   reach       flank: a creature striking within this many tiles of the Wayfarer has the Wayfarer engaged
//   radius      swarm: the tight ring; `lead` 1: a place turns into the lane the Wayfarer runs for (at most half a place)
//   band (ranged)  tiles it keeps, never beyond its own shot less `margin`; `lane` tiles of clear line it wants
//   offset      ranged: degrees off the front line's centre, `step` between ranged neighbours
export const TACTICS = {
  version: TACTICS_VERSION,
  rankCap: 12, // creatures per role that take a place in the formation (beyond, they keep the release-975 ring)
  anchor: { turn: 1.6, settle: .35 }, // rad/s the squad's front turns; the front only moves when its members agree this much
  roles: {
    front: { band: .88, steer: 1.1, place: 30, spread: 34, max: 68, wide: 150 },
    flank: { band: .85, steer: 1.5, place: 40, from: 100, patience: .5, reach: 3.2 },
    swarm: { radius: 1.2, lead: 1, steer: 1.3, moving: .6 },
    ranged: { band: [3.8, 5.8], margin: .4, steer: 1, place: 25, offset: 17, step: 34, lane: .55, laneEvery: .2, strafe: .8 },
  },
  // family -> role (null: its own brain only; the Gaunt keeps its own moves, adventure creatures their own haunts)
  families: { brood: "swarm", beast: "flank", humanoid: "front", brute: "front", caster: "ranged", adventure: null, duelist: null },
  // kind -> role, over its family's
  kinds: { veilSpinner: "ranged", weepingSaint: null, gloomwisp: "swarm", coilStalker: "flank", hollowMiner: "front" },
  // The surround: tokens per pool, `base` + one per `per` engaged, at most `max`; never below the release-975 caps
  // (BEHAVIOUR.tokens melee 3, swarm 8, ranged 2 at most).
  // `surround` switches it on. It is off until the release-975 token test's pinned cap (tests/enemy-behaviour.test.ts, "eight
  // engaged: three close tokens") is updated with it: on, eight engaged get six close tokens.
  surround: false,
  tokens: { melee: { base: 3, per: 2, max: 6 }, swarm: { base: 6, per: 2, max: 12 }, ranged: { base: 2, per: 2, max: 3 } },
  aggression: { rest: .55 }, // share of the release-975 rest between blows it keeps
  punish: { swingCommit: .12, swingTail: .22, dodgeTail: .4, healShare: .05, healTail: .9, reach: 3.4 },
  tell: { rear: .15, rearDot: -.35 }, // seconds more windup for a blow from behind the Wayfarer's facing (cos beyond rearDot)
  // pack courage: a melee creature with at least `kin` engaged kin within `reach` tiles never takes the release-975 coward's
  // retreat (it presses until it dies); a lone one still may, and casters still fall back
  courage: { roles: ["front", "flank", "swarm"], reach: 4, kin: 1 },
  regroup: { roles: ["ranged"], hp: .35, healthy: .6, time: 2.2, behind: 1.3 }, // a badly hurt caster falls back behind a healthy front-liner, once
  // the wombo combo: up to `stack` blows from ordinary creatures land together (within `window` s), then `iframes` s of hurt
  // window instead of the game's usual 0.7 s (game.ts packHurt and the older creatures' blow; never for any other source)
  hurt: { stack: 2, window: .25, iframes: .35 },
};

// ---------------------------------------------------------------- roles
const ROLE_OF = new Map(); // kind -> role (bounded by the table's kinds)
export function tacticRole(e, B = behaviourProfile(e)) {
  if (!B || B.tokensOnly) return null;
  let r = ROLE_OF.get(e.kind); if (r !== undefined) return r;
  r = e.kind in TACTICS.kinds ? TACTICS.kinds[e.kind] : TACTICS.families[B.family] ?? null;
  ROLE_OF.set(e.kind, r); return r;
}
const ROLES = ["front", "flank", "swarm", "ranged"], POOLS = ["melee", "swarm", "ranged"];

// ---------------------------------------------------------------- the board's part (made once with the squad board)
export function createTactics() {
  const cap = TACTICS.rankCap, members = () => ({ n: 0, e: new Array(cap).fill(null), a: new Float64Array(cap), r: new Int8Array(cap) });
  return { v: TACTICS_VERSION, frame: 0, anchor: 0, anchored: false, fx: 0, fy: 1, vx: 0, vy: 0, lx: NaN, ly: NaN, hp: NaN,
    swingFor: 0, swingTail: 0, healUntil: -1e12, punish: false, engagedN: 0, engagedId: null, cover: null, coverX: 0, coverY: 0, front: 0,
    roles: { front: members(), flank: members(), swarm: members(), ranged: members() },
    stats: { punished: 0, pressed: 0, held: 0, blocked: 0, regroups: 0, rearTells: 0, brave: 0 } };
}
function rec(e, b) {
  let t = b.tac;
  if (!t) { t = b.tac = { frame: -1, role: null, slot: 0, place: false, out: 0, blocked: false, side: 0, laneT: 0, laneAt: -1e12, regroup: 0, regrouped: false, rest: 0 }; }
  return t;
}
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const FACING = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
function kinWithin(e, enemies, r) { let n = 0; for (const q of enemies) { if (q === e || q.dead || !q.aggro || !q.bhv || q.bhv.retreat > 0 || Math.abs(q.x - e.x) > r || Math.abs(q.y - e.y) > r) continue; if (Math.hypot(q.x - e.x, q.y - e.y) <= r) n++; } return n; } // bounded: only for a hurt creature, at the moment it would turn tail

// Once a frame, after squadFrame: the surround caps, the Wayfarer's state (facing, motion, punish windows), who is engaged,
// the squad's front, each engaged member's place in its role, and the pressure on its rests.
export function tacticsFrame(board, enemies, player, now, dt) {
  const T = board.tac; if (!T) return;
  T.frame = board.frame; const px = board.px, py = board.py, P = TACTICS.punish;
  if (TACTICS.surround) for (const k of POOLS) { const t = TACTICS.tokens[k]; board.cap[k] = Math.max(board.cap[k], Math.min(t.max, t.base + Math.floor(board.engaged[k] / t.per))); } // the surround
  // the Wayfarer: facing (the game's four ways, or where it moves), smoothed motion, a heal
  if (Number.isFinite(T.lx) && dt > 0) { const k = Math.min(1, dt * 6); T.vx += ((px - T.lx) / dt - T.vx) * k; T.vy += ((py - T.ly) / dt - T.vy) * k; }
  T.lx = px; T.ly = py;
  const f = FACING[player?.facing]; if (f) { T.fx = f[0]; T.fy = f[1]; } else if (Math.hypot(T.vx, T.vy) > .4) { const m = Math.hypot(T.vx, T.vy); T.fx = T.vx / m; T.fy = T.vy / m; }
  const hp = Number(player?.hp), maxHp = Math.max(1, Number(player?.maxHp) || 100);
  if (Number.isFinite(T.hp) && hp - T.hp >= maxHp * P.healShare) T.healUntil = now + P.healTail * 1000;
  T.hp = hp;
  // punish windows: deep in a swing (and just after), just out of a dodge, drinking
  if (board.swinging) { T.swingFor += dt; T.swingTail = P.swingTail; } else { T.swingFor = 0; T.swingTail = Math.max(0, T.swingTail - dt); }
  const dodgeEnd = Number(player?.dodgeUntil) || 0;
  T.punish = (board.swinging && T.swingFor >= P.swingCommit) || (!board.swinging && T.swingTail > 0) || (dodgeEnd > 0 && now >= dodgeEnd && now - dodgeEnd < P.dodgeTail * 1000) || now < T.healUntil;
  // members, the engaged count, pressure
  for (const k of ROLES) T.roles[k].n = 0;
  T.engagedN = 0; T.engagedId = null; let sx = 0, sy = 0, sn = 0, fsx = 0, fsy = 0, fn = 0, cover = null, coverShare = TACTICS.regroup.healthy;
  const cap = TACTICS.rankCap, keep = TACTICS.aggression.rest;
  for (const e of enemies) {
    const b = e.bhv; if (!b || e.dead) continue;
    const B = behaviourProfile(e), role = tacticRole(e, B); if (!role || !e.aggro || b.arrive > 0) continue;
    const t = rec(e, b); t.role = role; t.frame = T.frame;
    if (B.retreat && !b.fled && !(b.retreat > 0) && e.hp < (Number(e.maxHp) || 0) * B.retreat.hp && TACTICS.courage.roles.includes(role) && kinWithin(e, enemies, TACTICS.courage.reach) >= TACTICS.courage.kin) { b.fled = true; T.stats.brave++; } // with its pack about it, it never turns tail (the 975 retreat runs once: this spends it)
    const dx = e.x - px, dy = e.y - py, d = Math.hypot(dx, dy) || 1e-6;
    if (holdsToken(e) && b.pool !== "ranged" && d <= TACTICS.roles.flank.reach) { T.engagedN++; T.engagedId = e.id; }
    // pressure: a fresh rest is shortened once; a punish window in reach cuts it outright
    if (b.rest > t.rest + 1e-9) { b.rest *= keep; T.stats.pressed++; }
    if (T.punish && b.rest > 0 && d <= P.reach && !(t.regroup > 0)) { b.rest = 0; T.stats.punished++; }
    t.rest = b.rest;
    if (t.regroup > 0) t.regroup = Math.max(0, t.regroup - dt);
    if (b.retreat > 0) continue; // a caster's release-975 retreat: it takes no place
    sx += dx / d; sy += dy / d; sn++;
    if (role === "front") { fsx += dx / d; fsy += dy / d; fn++; const share = (Number(e.hp) || 0) / Math.max(1, Number(e.maxHp) || 1); if (share > coverShare) { coverShare = share; cover = e; } }
    const M = T.roles[role]; if (M.n < cap) { M.e[M.n] = e; M.n++; }
  }
  T.cover = cover; if (cover) { T.coverX = cover.x; T.coverY = cover.y; }
  T.front = fn;
  // the squad's front: towards its front line (or the whole group), turning only so fast, and only when they agree
  const ux = fn ? fsx : sx, uy = fn ? fsy : sy, un = fn || sn, mag = Math.hypot(ux, uy);
  if (un && mag >= un * TACTICS.anchor.settle) {
    const want = Math.atan2(uy, ux);
    if (!T.anchored) { T.anchor = want; T.anchored = true; } else { const err = wrap(want - T.anchor), step = TACTICS.anchor.turn * dt; T.anchor = wrap(T.anchor + Math.max(-step, Math.min(step, err))); }
  } else if (!T.anchored && sn) { T.anchor = Math.atan2(T.fy, T.fx); T.anchored = true; }
  for (const k of ROLES) place(T, k, px, py);
  // regroup: a badly hurt caster falls back behind the healthiest front-liner, once (instead of the 975 straight-back retreat)
  const G = TACTICS.regroup;
  if (cover) for (const k of G.roles) { const M = T.roles[k]; for (let i = 0; i < M.n; i++) { const e = M.e[i], b = e.bhv, t = b.tac; if (t.regrouped || !(e.hp < (Number(e.maxHp) || 0) * G.hp)) continue; t.regrouped = true; t.regroup = G.time; b.fled = true; T.stats.regroups++; b.press = 0; } }
}
// Places in a role, ranked by where each member stands now (so none crosses another's path).
function place(T, role, px, py) {
  const M = T.roles[role], n = M.n; if (!n) return;
  for (let i = 0; i < n; i++) { const e = M.e[i]; M.a[i] = wrap(Math.atan2(e.y - py, e.x - px) - T.anchor); }
  for (let i = 0; i < n; i++) { let r = 0; for (let j = 0; j < n; j++) if (M.a[j] < M.a[i] || (M.a[j] === M.a[i] && j < i)) r++; M.r[i] = r; }
  const R = TACTICS.roles[role];
  if (role === "front") { const half = Math.min(R.wide, Math.max(R.max, (n - 1) / 2 * R.spread)), step = n > 1 ? Math.min(R.spread, 2 * half / (n - 1)) : 0; for (let i = 0; i < n; i++) M.e[i].bhv.tac.slot = T.anchor + (M.r[i] - (n - 1) / 2) * step * DEG; } // a wide front line spreads (up to `wide`) rather than stacking at its ends
  else if (role === "ranged") for (let i = 0; i < n; i++) M.e[i].bhv.tac.slot = T.anchor + ((M.r[i] - (n - 1) / 2) * R.step + (n % 2 ? R.offset : 0)) * DEG;
  else if (role === "flank" && T.front) { // sides and back: each keeps the side it is on
    let left = 0; for (let i = 0; i < n; i++) if (M.a[i] < 0) left++;
    const right = n - left;
    for (let i = 0; i < n; i++) {
      const neg = M.a[i] < 0, k = neg ? left - 1 - M.r[i] : M.r[i] - left, count = neg ? left : right; // 0 = nearest the front on its side
      M.e[i].bhv.tac.slot = T.anchor + (neg ? -1 : 1) * (R.from + (180 - R.from) * (k + .5) / count) * DEG;
    }
  } else { // the swarm, or flankers with no front line: evenly round the Wayfarer
    let base = T.anchor - Math.PI + Math.PI / n;
    if (role === "swarm") { const v = Math.hypot(T.vx, T.vy), step = 2 * Math.PI / n; if (v > TACTICS.roles.swarm.moving) { let turn = wrap(Math.atan2(T.vy, T.vx) - base); turn -= Math.round(turn / step) * step; base += turn * TACTICS.roles.swarm.lead; } } // a place in the lane it runs for (the ring turns at most half a place, so nobody crosses)
    for (let i = 0; i < n; i++) M.e[i].bhv.tac.slot = base + M.r[i] * 2 * Math.PI / n;
  }
}

// ---------------------------------------------------------------- the hooks the brains call
// May it ask for a token now? (squadRequest asks first.) Held back only: a shot whose line runs through kin, a caster falling
// back, and a flanker out of its place for a moment (TACTICS.roles.flank.patience) while the Wayfarer is free. A punish window
// lets everything but the blocked shot through.
export function tacticsAllow(board, e, b, pool) {
  const T = board.tac, t = b?.tac; if (!T || !t || t.frame !== T.frame) return true;
  if (pool === "ranged" && t.blocked && board.now - t.laneAt < 3 * TACTICS.roles.ranged.laneEvery * 1000) { T.stats.blocked++; return false; }
  if (T.punish) return true;
  if (t.regroup > 0) { T.stats.held++; return false; }
  if (t.role === "flank" && pool !== "ranged" && !t.place && !(T.engagedN > 1 || (T.engagedN === 1 && T.engagedId !== e.id))) {
    t.out += board.dt; if (t.out < TACTICS.roles.flank.patience) { T.stats.held++; return false; }
  }
  return true;
}
const V = { x: 0, y: 0, speed: 0 };
// Polar steering to a place on a ring round the Wayfarer: round the ring by the error in angle, in or out by the error in reach.
function steer(e, board, slot, radius, gain, place) {
  const dx = e.x - board.px, dy = e.y - board.py, d = Math.hypot(dx, dy), on = d < .05, ox = on ? Math.cos(slot) : dx / d, oy = on ? Math.sin(slot) : dy / d; // on top of the Wayfarer (a leap landed there): out towards its place
  const err = on ? Math.PI : wrap(slot - Math.atan2(dy, dx)), tang = on ? 0 : Math.max(-1, Math.min(1, err * gain)), rad = Math.max(-1.2, Math.min(1.2, (d - radius) * .9));
  V.x = -oy * tang - ox * rad; V.y = ox * tang - oy * rad; // round (counter-clockwise for a positive error), then in
  return Math.abs(err) <= place * DEG;
}
// The ring of a spacing creature (enemy-behaviour.ts ringVector asks): its place in its role instead of free strafing. Null when
// tactics have nothing to say (no board part, not placed this frame).
export function tacticsRing(e, b, B, board) {
  const T = board.tac, t = b?.tac; if (!T || !t || t.frame !== T.frame || !t.role) return null;
  const S = TACTICS.roles, [near, far] = B.band, mid = (near + far) / 2;
  let slot = t.slot, radius = mid, gain = S.front.steer, place = S.front.place;
  if (t.regroup > 0 && T.cover && T.cover !== e) { slot = Math.atan2(T.coverY - board.py, T.coverX - board.px); radius = Math.hypot(T.coverX - board.px, T.coverY - board.py) + TACTICS.regroup.behind; }
  else if (t.role === "front") radius = mid * S.front.band;
  else if (t.role === "flank") { radius = mid * S.flank.band; gain = S.flank.steer; place = S.flank.place; }
  else if (t.role === "ranged") { radius = Math.max(mid, S.ranged.band[0]); gain = S.ranged.steer; place = S.ranged.place; }
  else if (t.role === "swarm") { radius = Math.min(mid, S.swarm.radius); gain = S.swarm.steer; }
  t.place = steer(e, board, slot, radius, gain, place); if (t.place) t.out = 0;
  const off = Math.abs(Math.hypot(e.x - board.px, e.y - board.py) - radius);
  V.speed = t.place && off < .5 ? .6 : 1; return V;
}
// The way a creature without a ring of its own goes (monster-pack brainVector and the older brain's chase ask first): the swarm
// to its place on the tight ring, a ranged creature to its place behind the front line with a clear line, a hurt caster behind
// its cover. Null when its own brain should go on (a token held, out of sight, no place this frame).
export function tacticsMove(e, b, B, board, d) {
  const T = board.tac, t = b?.tac; if (!T || !t || t.frame !== T.frame || !t.role) return null;
  if (b.retreat > 0 || b.back > 0 || (t.role !== "swarm" && (b.press > 0 || b.comboLeft > 0 || holdsToken(e)))) return null; // the swarm keeps its place between bites
  const S = TACTICS.roles;
  if (t.regroup > 0 && T.cover && T.cover !== e) { steer(e, board, Math.atan2(T.coverY - board.py, T.coverX - board.px), Math.hypot(T.coverX - board.px, T.coverY - board.py) + TACTICS.regroup.behind, 1.2, 30); V.speed = .9; return V; }
  if (t.role === "swarm") { const R = S.swarm; t.place = steer(e, board, t.slot, R.radius, R.steer, 30); V.speed = d > R.radius + 1.2 || !t.place ? 1 : .6; return V; }
  if (t.role !== "ranged" || e.instantStrike) return null; // an instant striker (the Veil Moth) closes to strike: no range to keep
  const R = S.ranged, w = board.w;
  if (w && w.los && !w.los(e, w.player, true)) { t.blocked = false; return null; } // out of sight: its own brain finds a way
  const reach = Number(e.range) >= 2.5 ? Number(e.range) - R.margin : B.band[1], far = Math.min(R.band[1], reach), near = Math.min(R.band[0], far - .6), radius = (near + far) / 2;
  t.place = steer(e, board, t.slot, radius, R.steer, R.place);
  t.laneT -= board.dt; if (t.laneT <= 0) { t.laneT = R.laneEvery; laneCheck(e, t, board); }
  if (t.blocked) { const dx = e.x - board.px, dy = e.y - board.py, m = Math.hypot(dx, dy) || 1; V.x += -dy / m * t.side * R.strafe; V.y += dx / m * t.side * R.strafe; } // sidestep out of the friend's way
  const dd = d - radius; V.speed = dd > 1 || dd < -1 || t.blocked || !t.place ? .9 : .45; return V;
}
// Is a friend standing in its line of fire? Bounded: a box test first, then the distance to the segment.
function laneCheck(e, t, board) {
  const R = TACTICS.roles.ranged, ax = e.x, ay = e.y, bx = board.px, by = board.py, lx = bx - ax, ly = by - ay, L2 = lx * lx + ly * ly || 1;
  const minX = Math.min(ax, bx) - R.lane, maxX = Math.max(ax, bx) + R.lane, minY = Math.min(ay, by) - R.lane, maxY = Math.max(ay, by) + R.lane;
  t.blocked = false; t.laneAt = board.now;
  for (const q of board.enemies || []) {
    if (q === e || q.dead || q.ambient || q.passiveBehavior || q.kind === "npc" || q.x < minX || q.x > maxX || q.y < minY || q.y > maxY) continue;
    const u = ((q.x - ax) * lx + (q.y - ay) * ly) / L2; if (u <= .12 || u >= .92) continue;
    const cx = ax + lx * u - q.x, cy = ay + ly * u - q.y; if (cx * cx + cy * cy > R.lane * R.lane) continue;
    t.blocked = true; t.side = (lx * (q.y - ay) - ly * (q.x - ax)) > 0 ? 1 : -1; board.tac.stats.blocked++; return; // step to the side away from it
  }
}
// A windup is about to start (`wind` seconds): how many seconds longer its tell must be. Only a blow from behind the
// Wayfarer's facing gets more (TACTICS.tell.rear); nothing is ever shortened, and blows from different attackers may land together.
export function tacticsWindup(board, e, b, wind) {
  const T = board.tac; if (!T || !b || !(wind >= 0)) return 0;
  rec(e, b);
  const dx = e.x - board.px, dy = e.y - board.py, m = Math.hypot(dx, dy) || 1;
  if ((dx * T.fx + dy * T.fy) / m >= TACTICS.tell.rearDot) return 0;
  T.stats.rearTells++; return TACTICS.tell.rear;
}
// The Wayfarer's hurt window after a blow from an ordinary creature of an activated squad (game.ts packHurt and the older
// creatures' blow ask): up to TACTICS.hurt.stack blows may land together (within `window` s: no window opens between them),
// then a shorter window than the usual (`iframes` s). Any other source (bosses, elites, beasts, hazards), or a creature that
// never ran with a squad board, keeps `ms` exactly. Runtime only: the combo count lives on the Wayfarer, not enumerable (`tacHit`; never saved, one per game). Returns the ms
// to add to `now` (negative: no window at all).
export function tacticsHurtWindow(source, now, ms, player = null) {
  if (!source?.bhv?.tac || !tacticRole(source) || !player || typeof player !== "object") return ms;
  let HIT = player.tacHit; if (!HIT) { HIT = { at: -1e12, n: 0 }; Object.defineProperty(player, "tacHit", { value: HIT, writable: true, enumerable: false, configurable: true }); }
  const H = TACTICS.hurt, t = Number(now) || 0;
  if (t < HIT.at || t - HIT.at > H.window * 1000) { HIT.at = t; HIT.n = 0; }
  HIT.n++;
  if (HIT.n < H.stack) return -1; // open: the next blow of the combo may land on the same frame
  HIT.n = 0; HIT.at = -1e12; return Math.min(ms, H.iframes * 1000);
}
// The release-975 caps the surround never goes below (for the tests and the report).
export function baseCaps() { const out = {}; for (const k of POOLS) out[k] = BEHAVIOUR.tokens[k].max; return out; }
