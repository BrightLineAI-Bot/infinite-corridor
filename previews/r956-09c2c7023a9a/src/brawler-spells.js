import { interiorCeilingHeight, interiorArchAt, INTERIOR_TRAVERSAL } from './vehicle-gates.js?v=r956-09c2c7023a9a';
import { PRIMARY_PROFILES, primaryProfile } from './items.js?v=r956-09c2c7023a9a';

// Brawler spells (release 483; Tim, 2026-10-27: "we can even have like spell sword spells... like a giant hammer that comes
// down and attacks... another one that does a large sweep with a sword. And these can be buffed by melee damage... these are
// brawler type [spells]... another one can be like a charge punch fist... you [dash] forward and you punch... you can like
// charge it up if you hold the spell button... the hammer... in whatever direction he's facing, or... the regular, like,
// targeting... that applies for attacking").
//
// Three spells that hit like weapons: their damage is a share of a swing's (Game.meleePower: the weapon, the melee bonus and
// every melee-damage multiplier), not of the magic stats. They aim like a swing: the locked target, else the foe auto aim
// picks, else the way you face.
//   Hammerfall: a hammer of light falls on the foe (or `reach` tiles ahead) after `delay` s; a heavy blow in `radius` that
//     staggers (`stun` s; a quarter of that for bosses and elites).
//   Great Sweep: a blade sweeps all the way round you: every foe within `radius`.
//   Iron Fist (a spell in 483 and 485; the Iron Fists tool from release 489, see IRON_FISTS): press and hold to charge (up to `chargeTime` s past `tapGrace`); let go to dash `dash` tiles plus `chargeDash`
//     at full charge toward the aim and punch in `radius`. Damage goes from `share` to `share + chargeShare` with the charge.
//     The dash stops at walls and lethal ground, and you cannot be hurt during it.
// The spells are ordinary SPELLS entries (items.ts, `brawler: true`), so slots, presets, glyph sockets and cooldowns treat them
// like the others. game.ts runs them (castBrawler for Aegis and Shadow Boxing; brawlerTool for Hammerfall and Great Sweep; fistPress and fistPunch for the Iron Fists); drawBrawler below draws them.
export const BRAWLER = {
  // Release 493 (Tim: "the hammer fall and the great sweep are tools"): tools now, each press costs `cooldown` s; damage is a
  // share of the tool's power (Game.toolPower), not of a spell.
  hammerfall: { share: 1.8, radius: 1.5, reach: 2.6, delay: .32, stun: .6, cooldown: 1.2, lifetime: .25 },
  "great-sweep": { share: 1.2, radius: 2.4, cooldown: 1, lifetime: .3 },
  // Release 485 (Tim: "a shield where you can put up this shield for like a second... it'll just like block damage"): every
  // blow is turned aside for `ms`. A fall into lava or a chasm is not a blow.
  aegis: { ms: 1000 },
  // Release 485 (Tim: "shadow boxing... if you [lock] on a target, you can hit the melee... moves and it will move with the
  // target... stick to him... a bruiser... healing passives, or... damage reduction passives, or... damage increased
  // passives"): for `seconds`, each swing first carries you to your foe (the lock, else the nearest within `stick` tiles past
  // your reach) if it is out of reach, stopping at walls; your blows deal `damage` more and heal `heal` of what they deal,
  // and you take `guard` less damage.
  // Release 493/495: it works with the Iron Fists' punches and with the Hammerfall and Great Sweep tools as well (the hammer
  // reaches `stick` tiles farther, the sweep carries you to the foe first; each deals `damage` more and heals `heal`).
  "shadow-boxing": { seconds: 8, stick: 4, damage: .1, heal: .06, guard: .15 },
};
// Shadow Boxing's charge (Tim, 2026-11-14: "you still just kind of teleport... I want to see him traversing the space to get
// to where he needs to be... have him charge to where he needs to be"). A swing pressed with the foe out of reach no longer
// moves the Wayfarer in one update: game.ts shadowDashBegin records a dash (Game.shadowDash, saved with the journey at `v`),
// shadowDashSteer carries him along it each tick through the same quarter-tile collision mover the old carry used (canStand
// and moveGuardedCombatStep: walls, solid props, bodies, lethal ground and ledges stop him), and shadowDashLand throws the
// accepted swing on the tick he arrives, so the blow lands on arrival. The same in every area and in both views; only the
// drawing differs (shadowDashGhosts below, Close View close-view-shadow-forms.ts followShadowDash).
//   Duration: `minMs` + travel at a mean `speed`, clamped to [minMs, maxMs]: ms = clamp(1000 × tiles / speed, minMs, maxMs).
//     24 tiles/s is ten times a walk and five times a dodge, unmistakably a charge, yet at 60 fps the body moves at most about
//     .5 tile a frame (peak 1.25× the mean), 7 to 13 drawn frames a dash. 120 ms (7 frames) is the shortest span that still
//     reads as travel rather than a pop; 220 ms covers the longest carry (reach + `stick` + 1 tiles less the stop, about 5.5
//     tiles) and stays under the Verge Cleaver's 230 ms forehand wind-up and the 420 ms press cooldown, so the press and the
//     blow stay one gesture.
//   The path eases (half linear, half smoothstep): he sets off and lands with weight, peak speed 1.25× the mean. Each tick he
//     covers the eased share of what is left to the foe's live place, so a stepping foe is tracked and the dash still ends on
//     time. At most `maxTiles` in one dash.
//   `cooldownCredit`: the share of the dash's time that counts toward the press cooldown (attackReadyAt) of the blow thrown
//     on arrival, so damage per second holds (the cooldown runs during the charge). A weighted swing (melee-swing.ts, the
//     Verge Cleaver) has its own clock instead: the charge stands in for its wind-up, so the swing starts on arrival already
//     cocked, with only the last `swingLeadMs` (× its tempo) of the wind-up left, and strikes then. Measured in
//     tests/shadow-boxing-dash.test.ts.
//   Drawing: `ghosts` afterimages `spacing` of the dash apart along the travelled path, alpha `alpha` falling off behind,
//     fading over `fadeMs` after arrival; the body leans in and sinks (close-view-shadow-forms.ts `lean`, `crouch`) over the
//     first `rampIn` of the dash and settles over `settleMs`. Drawn at every quality tier and in safe mode (fixed slots, no allocation).
export const SHADOW_DASH = Object.freeze({
  v: 1, speed: 24, minMs: 120, maxMs: 220, step: .25, maxTiles: 8, cooldownCredit: 1, swingLeadMs: 60,
  ghosts: 4, spacing: .17, alpha: .55, fadeMs: 180, rampIn: .2, settleMs: 140,
});
const clamp01 = (v) => v <= 0 ? 0 : v >= 1 ? 1 : v;
const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
// The dash's time for `tiles` of travel (ms).
export function shadowDashMs(tiles) { const D = SHADOW_DASH, n = Number(tiles); return Math.max(D.minMs, Math.min(D.maxMs, Number.isFinite(n) && n > 0 ? 1000 * n / D.speed : 0)); }
// The share of the path covered at time fraction t: half linear, half smoothstep.
export function shadowDashTravel(t) { t = clamp01(t); return .5 * t + .5 * t * t * (3 - 2 * t); }
// The saved dash (playerRuntime.shadowDash, additive at schema 14). A valid version-1 record comes back clean; a newer one is
// kept as it is (opaque); anything else is null (the dash is dropped and the press with it, rather than resumed wrong).
const finiteIn = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export function normalizeShadowDash(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Number.isInteger(raw.v) && raw.v > SHADOW_DASH.v) return structuredClone(raw);
  if (raw.v !== SHADOW_DASH.v) return null;
  if (!['area', 'areaId', 'levelId', 'foe'].every((k) => typeof raw[k] === 'string' && raw[k].length <= 512)) return null;
  if (!finiteIn(raw.fromX, -1e4, 1e5) || !finiteIn(raw.fromY, -1e4, 1e5) || !finiteIn(raw.durationMs, SHADOW_DASH.minMs, SHADOW_DASH.maxMs) || !finiteIn(raw.elapsedMs, 0, SHADOW_DASH.maxMs)
    || !finiteIn(raw.travelled, 0, SHADOW_DASH.maxTiles) || !finiteIn(raw.stop, 0, 20)) return null;
  return { ...structuredClone(raw), elapsedMs: Math.min(raw.elapsedMs, raw.durationMs), arrived: raw.arrived === true, action: raw.action === 'attack' ? 'attack' : null };
}
// Shadow trails (Tim, 2026-11-14: "the Iron Fists' Shadow Boxing rush... give it the same after-images and speed streak as
// the charge so you see him cross the space"; "when the Wayfarer dodges, with any weapon, show the same ghost trail").
// Presentation only: game.ts writes a record (Game.shadowTrail, never saved, one object reused) and nothing reads it back
// into gameplay; the moves themselves are untouched. Two kinds share SHADOW_DASH's ghosts, streak, pool and fade:
//   carry: a move made in one update (the Iron Fists' rush while Shadow Boxing holds, and shadowBoxStep: the Great Sweep's
//     carry, the fists' later steps and the airborne carries). It is drawn as a charge that has already arrived: the ghosts
//     start spread back along the path (from about 30% to 90% of it) and close in on the Wayfarer over `carryMs` as they
//     fade, with the 952 lean and wraith settling. The body is drawn on its true place (no lag), so a blow is never drawn
//     anywhere but where it lands.
//   dodge: while the dodge runs, ghosts back along its path from where it began (linear, as the dodge moves), then the same
//     close-in fade; no lean and no wraith tint (the roll keeps its own pose).
// Moves shorter than `minJump` tiles are not marked, longer than `maxJump` are teleports (drawn as they are). Drawn at every
// quality tier and in safe mode; with reduced motion on none of it is drawn (Close View keeps the release-922 reduced-motion
// fade). A newer 952 charge record (shadowDashAfter) wins over an older trail and the reverse.
export const SHADOW_TRAIL = Object.freeze({ minJump: .6, maxJump: 12, carryMs: 220 });
const lerpTravel = (t, linear) => linear ? clamp01(t) : shadowDashTravel(t);
export function markShadowTrail(game, fromX, fromY, now, kind = "carry") {
  const T = SHADOW_TRAIL, p = game?.player; if (!p || !Number.isFinite(fromX) || !Number.isFinite(fromY) || !Number.isFinite(now)) return false;
  const dodge = kind === "dodge";
  if (!dodge) { const d = Math.hypot(p.x - fromX, p.y - fromY); if (!(d >= T.minJump) || d > T.maxJump) return false; }
  const r = game.shadowTrail || (game.shadowTrail = { live: false, map: null, at: 0, endAt: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, durationMs: 1, moving: false, linear: false, pose: false });
  r.live = true; r.map = game.map; r.at = now; r.fromX = fromX; r.fromY = fromY; r.toX = p.x; r.toY = p.y; r.moving = dodge; r.linear = dodge; r.pose = !dodge && kind !== "rush"; // "rush": the Iron Fists' plain cross rush (Tim 2026-11-14), ghosts without the Shadow Boxing lean and tint
  r.endAt = now; r.durationMs = dodge ? Math.max(1, (Number(p.dodgeUntil) || now) - now) : T.carryMs;
  return true;
}
// Once a tick, after the move: a running dodge's trail follows the Wayfarer and is closed when the dodge ends. No allocation.
export function shadowTrailTick(game, now) {
  const r = game?.shadowTrail, p = game?.player; if (!r?.live || !p) return;
  if (r.map !== game.map) { r.live = false; return; }
  if (r.moving) { if (now < (Number(p.dodgeUntil) || 0)) { r.toX = p.x; r.toY = p.y; } else { r.moving = false; r.endAt = now; } }
  else if (now - r.endAt >= Math.max(SHADOW_DASH.settleMs, SHADOW_DASH.fadeMs)) r.live = false;
}
// The trail record that drives the drawing now, or null (none, reduced motion, another map, or a teleport mid-dodge).
function trailNow(game) {
  const r = game?.shadowTrail, p = game?.player, a = game?.shadowDashAfter;
  if (!r?.live || !p || game.presentation?.reduceMotion || r.map !== game.map) return null;
  if (a?.live && a.at > r.at) return null; // a newer Shadow Boxing charge owns the drawing
  if (r.moving && Math.hypot(p.x - r.fromX, p.y - r.fromY) > SHADOW_TRAIL.maxJump) return null;
  return r;
}
// True while a trail is being drawn (renderer.ts draws its older single dodge ghost only when it is not).
export function shadowTrailLive(game) { const r = trailNow(game); return !!r && (r.moving || (game.lastUpdateNow || 0) - r.endAt < SHADOW_DASH.fadeMs); }
// The afterimages to draw now, nearest first, as [x, y, alpha] triples into `out` (a Float64Array of 3 × SHADOW_DASH.ghosts):
// during a dash (game.shadowDash) back along the path from where it set off to where the Wayfarer is, and for `fadeMs` after
// arrival (game.shadowDashAfter) closing in on the arrival point as they fade; the same for a shadow trail (above). Returns
// the count. Logical tile coordinates. No allocation.
export function shadowDashGhosts(game, out) {
  const D = SHADOW_DASH, q = game?.shadowDash, a = game?.shadowDashAfter, p = game?.player; let n = 0;
  if (!p || !out) return 0;
  let t, fx, fy, tx, ty, fade, denom, linear = false, r;
  if (q?.v === D.v && !(q.arrived)) { t = q.elapsedMs / q.durationMs; fx = q.fromX; fy = q.fromY; tx = p.x; ty = p.y; fade = 1; denom = shadowDashTravel(Math.min(1, t)); }
  else if ((r = trailNow(game))) {
    const now = game.lastUpdateNow || 0; linear = r.linear; fx = r.fromX; fy = r.fromY;
    if (r.moving) { t = Math.max(0, now - r.at) / r.durationMs; tx = p.x; ty = p.y; fade = 1; denom = lerpTravel(Math.min(1, t), linear); }
    else { const after = Math.max(0, now - r.endAt); if (after >= D.fadeMs) return 0; t = 1 + after / r.durationMs; tx = r.toX; ty = r.toY; fade = 1 - after / D.fadeMs; denom = 1; }
  }
  else if (a?.live) { const after = Math.max(0, (game.lastUpdateNow || 0) - a.at); if (after >= D.fadeMs) return 0; t = 1 + after / a.durationMs; fx = a.fromX; fy = a.fromY; tx = a.toX; ty = a.toY; fade = 1 - after / D.fadeMs; denom = 1; }
  else return 0;
  if (!(denom > 1e-6) || !Number.isFinite(t)) return 0;
  for (let k = 1; k <= D.ghosts && n < (out.length / 3 | 0); k++) {
    const tk = t - k * D.spacing; if (tk <= 0 || tk >= 1) continue;
    const e = lerpTravel(tk, linear) / denom, o = n * 3; if (!(e < 1)) continue;
    out[o] = fx + (tx - fx) * e; out[o + 1] = fy + (ty - fy) * e; out[o + 2] = D.alpha * (1 - k / (D.ghosts + 1)) * fade; n++;
  }
  return n;
}
// The charge pose weight (0..1): leaning in over the first `rampIn` of a dash, settling over `settleMs` after it. `wraith`:
// the spectral weight, 1 while charging and fading out as the body settles. A carry trail settles as an arrived charge; a
// dodge trail is live with no lean and no wraith.
export function shadowDashPose(game, out) {
  const D = SHADOW_DASH, q = game?.shadowDash, a = game?.shadowDashAfter;
  out.live = false; out.charge = 0; out.wraith = 0; out.t = 1;
  if (q?.v === D.v && !q.arrived) { out.live = true; out.t = clamp01(q.elapsedMs / q.durationMs); out.charge = smoothstep(out.t / D.rampIn); out.wraith = 1; return out; }
  const r = trailNow(game);
  if (r) { const now = game.lastUpdateNow || 0;
    if (r.moving) { out.live = true; out.t = clamp01(Math.max(0, now - r.at) / r.durationMs); return out; }
    const after = Math.max(0, now - r.endAt); if (after < Math.max(D.settleMs, D.fadeMs)) { const c = r.pose ? 1 - smoothstep(after / D.settleMs) : 0; out.charge = c; out.wraith = c; out.live = after < D.fadeMs || c > 0; }
    return out; }
  if (a?.live) { const after = Math.max(0, (game.lastUpdateNow || 0) - a.at), s = Math.max(D.settleMs, D.fadeMs); if (after < s) { out.charge = 1 - smoothstep(after / D.settleMs); out.wraith = out.charge; out.t = 1; out.live = after < D.fadeMs || out.charge > 0; } }
  return out;
}
const DASH_GHOSTS = new Float64Array(SHADOW_DASH.ghosts * 3); // the drawing pool for drawBrawlerAuras
// Imbue Weapon (Tim, 2026-11-04: "While Imbue Weapon is running, it gives you an aura and adds a magic-damage buff to your
// melee attacks... It scales only off your Focus: with zero Focus or magic it adds nothing, so on a Might build it adds very
// little. On a Focus build it's a way to use melee if you feel like it, but it will never be as strong as a pure Might build.
// Your primary damage as a caster stays spells, skills and synergies"). A spell (items.ts `imbue-weapon`, cast through
// castBrawler like Shadow Boxing) that lasts `seconds`. While it lasts every melee hit adds magic damage: each swing (and its
// glyph echo strike, at the echo's share), each Iron Fists punch, and each Hammerfall and Great Sweep blow (the strikes
// Spellblade calls melee). Not the Awakened crescent, the Shadow Clone's copies, tool shots, Mirage of Blades or the golem.
// The amount per hit, before the Imbue spell's own glyph damage mod and the spell-damage multipliers of armor glyphs, meals
// and pages (not Pairings, not melee multipliers): `focus` × (Focus − 1), plus `magic` × the magic bonus once Focus has had
// `gate` points put in (scaled in linearly below that). Focus 1, the starting value, adds exactly nothing. Recasting while it
// runs sets it back to the full `seconds` (it never stacks). It does not count as "a spell running" (Spellblade, Charged Air),
// so a Might build gains nothing through those passives either. `sparks` bounds the hit flashes drawn (a fixed ring).
export const IMBUE = { seconds: 20, focus: .3, magic: .18, gate: 100, sparks: 8, sparkLife: .3 };
// The aura, motes and hit flashes (drawBrawlerAuras): crimson with a dark edge.
export const IMBUE_COLORS = { glow: "#d4143a38", rim: "#ff2e4d", edge: "#2a0610", mote: "#ff5a6e", spark: "#ff3a55" };
const IMBUE_RIM = [[IMBUE_COLORS.edge, 3.5], [IMBUE_COLORS.rim, 1.5]], IMBUE_RAYS = [[IMBUE_COLORS.edge, 4], [IMBUE_COLORS.spark, 2]]; // dark under, red over
export function imbueAmount(focus, magicBonus) {
  const f = Math.max(0, (Number(focus) || 1) - 1); if (!(f > 0)) return 0;
  return IMBUE.focus * f + IMBUE.magic * Math.max(0, Number(magicBonus) || 0) * Math.min(1, f / IMBUE.gate);
}
// A hit flash where an imbued blow landed: a fixed ring of IMBUE.sparks slots, reused (no growth, no per-frame allocation).
export function imbueSpark(game, x, y, now) {
  const r = (game.imbueSparks ||= Array.from({ length: IMBUE.sparks }, () => ({ x: 0, y: 0, at: -1e9 }))), i = (game.imbueSparkAt = ((game.imbueSparkAt || 0) + 1) % r.length);
  r[i].x = x; r[i].y = y; r[i].at = now;
}
// Aegis, Shadow Boxing and Imbue Weapon, as the Wayfarer wears them (drawn round the player).
export function drawBrawlerAuras(ctx, game, toScreen, s, t, floor = false) {
  const now = game.lastUpdateNow || 0, [x, y] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 });
  // Imbue Weapon's palette (Tim, 2026-11-04: "red, not violet"): crimson, not the orange of fire and lava, with a dark edge
  // under each line so it still reads on lava and fire tiles; Aegis is blue, Shadow Boxing violet.
  const IR = IMBUE_COLORS;
  if (now < (game.imbueUntil || 0)) { // a crimson glow round the Wayfarer and motes circling the weapon hand
    const k = Math.min(1, (game.imbueUntil - now) / 1500); // fades over its last 1.5 s
    ctx.globalAlpha = .35 + .5 * k; ctx.fillStyle = IR.glow; ctx.beginPath(); ctx.arc(x, y, s * .75, 0, 7); ctx.fill();
    ctx.globalAlpha = (.35 + .5 * k) * (.7 + .3 * Math.sin(t * 5));
    for (const [c, w] of IMBUE_RIM) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, s * .75, 0, 7); ctx.stroke(); }
    ctx.fillStyle = IR.mote; ctx.strokeStyle = IR.edge; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.09; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * .55, y + Math.sin(a) * s * .3, s * .07, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  for (const q of game.imbueSparks || []) { const age = (now - q.at) / 1000; if (age < 0 || age >= IMBUE.sparkLife) continue; const k = 1 - age / IMBUE.sparkLife, [hx, hy] = toScreen(q);
    ctx.globalAlpha = k; for (const [c, w] of IMBUE_RAYS) { ctx.strokeStyle = c; ctx.lineWidth = w; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4, r0 = s * .12, r1 = s * (.3 + .25 * (1 - k)); ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0); ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1); ctx.stroke(); } }
    ctx.globalAlpha = 1; }
  if (now < (game.aegisUntil || 0)) { const k = (game.aegisUntil - now) / BRAWLER.aegis.ms; ctx.fillStyle = "#9fd0ff22"; ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 2.5; ctx.globalAlpha = .4 + .6 * k; ctx.beginPath(); ctx.arc(x, y, s * .85, 0, 7); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * .85, y + Math.sin(a) * s * .85); ctx.lineTo(x + Math.cos(a + Math.PI / 3) * s * .85, y + Math.sin(a + Math.PI / 3) * s * .85); ctx.stroke(); } ctx.globalAlpha = 1; }
  { const G = DASH_GHOSTS, n = shadowDashGhosts(game, G); // Shadow Boxing's charge: a speed streak and violet afterimages along the path (every tier, safe mode too)
    if (n > 0) { const far = toScreen({ x: G[(n - 1) * 3] + .5, y: G[(n - 1) * 3 + 1] + .45 }); ctx.globalAlpha = .35 * G[2] / SHADOW_DASH.alpha; ctx.strokeStyle = "#b99bff"; ctx.lineWidth = s * .22; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(far[0], far[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.lineCap = "butt";
      // the bodies (Close View draws its own 3D afterimages over this floor streak)
      if (!floor) for (let k = n - 1; k >= 0; k--) { const [gx, gy] = toScreen({ x: G[k * 3] + .5, y: G[k * 3 + 1] + .45 }); ctx.globalAlpha = G[k * 3 + 2]; ctx.fillStyle = "#6f4fc8"; ctx.beginPath(); ctx.ellipse(gx, gy, s * .24, s * .34, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#c9b2ff"; ctx.beginPath(); ctx.arc(gx, gy - s * .38, s * .14, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; } }
  if (now < (game.boxingUntil || 0)) { ctx.strokeStyle = "#7a5fc0"; ctx.lineWidth = 2; ctx.globalAlpha = .55 + .2 * Math.sin(t * 8); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(x, y + s * .35, s * .55, s * .2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  drawEssenceWalk(ctx, game, toScreen, s, t, now, x, y);
}
// Essence Walk (Tim, 2026-11-05: "a spell similar to Shadow Boxing, called Essence Walk... lets you cast your spells without
// waiting for the cooldown, but it costs stamina... Spells that have a longer cooldown cost more stamina to cast... spell-
// slinger builds: Essence Walk, then Gravity Well or whatever spell you want and spam it"). A spell (items.ts `essence-walk`,
// cast through castBrawler like Shadow Boxing) that opens a window of `seconds`. While it is open, casting any other spell
// that is still recovering casts it anyway for stamina (essenceCost) instead of refusing; that cast leaves the spell's
// cooldown exactly as it was, still running, so when the window closes you wait no longer than you would have without it.
// A spell that is ready casts as usual (free; its cooldown starts). With too little stamina the cast is refused. Spells in
// `exempt` keep their cooldowns (Essence Walk itself). Aperture disciplines (Rift Step, Ember Form...) are not spells and keep
// their cooldowns. Essence Walk's own cooldown is reduced like any spell's (Tim, 2026-11-05: "I should be able to get Essence
// Walk's cooldown as low as I can based on the glyphs"): a recast once it is ready sets the window back to the full `seconds`
// (it never stacks), so a cooldown cut below `seconds` keeps it up for good.
//   cost: stamina = `base` + `perSecond` × the spell's cooldown in seconds as it would recover now (after its glyphs, the
//     Pairing and armor/meal/page reductions, each already capped), rounded, then held between `min` and `max`. A spell in
//     `costs` pays that fixed amount instead.
//   lockout (Tim, 2026-11-05: "if you spam the Aegis and your stamina runs out, you can't spam the Aegis for its total
//     cooldown... you have to watch your stamina"): a stamina cast of a spell listed here that leaves too little stamina for
//     another locks it for its full cooldown (glyphs and the other reductions apply), and Essence Walk cannot cast it again
//     until that cooldown is over. Aegis: `costs.aegis` 40, about two casts from an 86-stamina pool.
//   trail: the drawn after-images, a fixed ring of `trail` slots sampled every `trailEvery` ms (none at reduced motion, in
//     safe mode or at low quality; the ring under the Wayfarer still shows).
export const ESSENCE_WALK = {
  seconds: 8,
  cost: { base: 5, perSecond: 4, min: 8, max: 60 },
  costs: { aegis: 40 },
  lockout: ["aegis"],
  exempt: ["essence-walk"],
  trail: 6, trailEvery: 90, trailLife: .5,
};
export const ESSENCE_COLORS = { glow: "#7fe6d62a", rim: "#c8fff4", edge: "#0b2624", mote: "#9ff0e2" };
// The stamina a recovering spell costs under Essence Walk, from its cooldown in seconds. Never negative, never NaN.
export function essenceCost(cooldownSeconds) {
  const C = ESSENCE_WALK.cost, cd = Math.max(0, Number(cooldownSeconds) || 0);
  return Math.round(Math.min(C.max, Math.max(C.min, C.base + C.perSecond * cd)));
}
export const essenceExempt = (id) => ESSENCE_WALK.exempt.includes(id);
// What spell `id` costs under Essence Walk, given its cooldown in seconds: its fixed `costs` entry, else essenceCost.
export function essenceSpellCost(id, cooldownSeconds) { const c = Number(ESSENCE_WALK.costs[id]); return Number.isFinite(c) && c >= 0 ? Math.round(c) : essenceCost(cooldownSeconds); }
export const essenceLockout = (id) => ESSENCE_WALK.lockout.includes(id);
// The ring under the Wayfarer and the fading after-images behind them. The after-images reuse a fixed ring of slots (no
// growth, no per-frame allocation once made).
function drawEssenceWalk(ctx, game, toScreen, s, t, now, x, y) {
  const until = game.essenceUntil || 0; if (!(now < until)) return;
  const E = ESSENCE_WALK, C = ESSENCE_COLORS, pr = game.presentation || {}, still = !!(pr.reduceMotion || pr.safeMode || pr.effectiveQuality === "low");
  const k = Math.min(1, (until - now) / 1500); // fades over its last 1.5 s
  if (!still) {
    const ring = (game.essenceTrail ||= Array.from({ length: E.trail }, () => ({ x: 0, y: 0, at: -1e9 })));
    if (now - (game.essenceTrailAt || -1e9) >= E.trailEvery) { game.essenceTrailAt = now; const q = ring[(game.essenceTrailI = ((game.essenceTrailI || 0) + 1) % ring.length)]; q.x = game.player.x + .5; q.y = game.player.y + .45; q.at = now; }
    ctx.fillStyle = C.mote;
    for (const q of ring) { const age = (now - q.at) / 1000; if (age < 0 || age >= E.trailLife) continue; const [hx, hy] = toScreen(q), f = 1 - age / E.trailLife; ctx.globalAlpha = .35 * f * (.4 + .6 * k); ctx.beginPath(); ctx.ellipse(hx, hy, s * .28 * f + s * .08, s * .4 * f + s * .1, 0, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = .4 + .4 * k; ctx.fillStyle = C.glow; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .6, s * .24, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = (.45 + .45 * k) * (still ? 1 : .75 + .25 * Math.sin(t * 6));
  ctx.strokeStyle = C.edge; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .6, s * .24, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = C.rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + s * .3, s * .6, s * .24, 0, 0, 7); ctx.stroke();
  ctx.globalAlpha = 1;
}
// Iron Fists (release 489; Tim: "let's make the iron fist a tool that you can use instead of a spell... a three button combo...
// the first punch is... your standard dash. You can charge it and then dash... you can hold it and dash farther... Second
// [punch] will be like a quick follow up. You can't hold it. And the third punch would be like an uppercut that does more
// damage. If... you land all three"). The Iron Fist spell of release 483 became a tool: gauntlets in the Tool slot. Each press
// of Tool throws the next punch of the combo while the last one's `window` s are open; past it, the combo starts again.
//   1. Dash punch: hold Tool to charge in place (up to `chargeTime` s past `tapGrace`); on release (a tap is a release at
//      once) it rushes to the foe you target (the lock, else auto aim) when it is within `rush` tiles, stopping `stop` short,
//      and punches for `share` plus `chargeShare` with the charge; with no foe in range it punches in place. Release 491 (Tim:
//      "the initial punch should [dash] you towards the enemy that you're targeting... if it's beyond range, then it should
//      just do a punch in place... a reasonable range... if you try to hold it, you'll stay in place and... charge it"). You
//      cannot be hurt during the rush.
//   2. Jab: a short step and a quick blow; it cannot be held.
//   3. Uppercut: the heavy blow, with a stagger. If both earlier punches landed, it is a finisher: `finisher` × the damage
//      and a longer stagger. After it, `recover` s before the next combo.
// Damage: (`base` + the gauntlets' power × `perPower` + the melee bonus) × the tool glyph mods × every melee-damage multiplier.
// The dashes stop at walls and lethal ground. game.ts runs it (fistPress, fistPunch); drawBrawler draws the blows.
// Release 493 (Tim: "the iron fist is an attack... shadow boxing should work with iron fist"): the Iron Fists are a weapon
// on the Attack button now (the same combo); while Shadow Boxing holds, the dash punch rushes `stick` tiles farther, the jab
// and uppercut step to the foe, and every punch deals and heals as a boxing swing does.
// Training combo (Tim, 2026-11-13: "a fluid training combo... right, left, right, then the kick"): the steps loop on one
// rhythm. Every step, the kick included, is followed by the same `gate` s before the next can be thrown (room for a wind-up, the
// blow and its follow-through; it replaced the old `recover` .45 s after the uppercut). A press in the gate's last `buffer` s
// waits for it and is thrown as it opens. Unawakened fists loop cross, jab, uppercut; awakened fists add the spinning
// roundhouse kick as a fourth step (its numbers are weapon-arts.ts AWAKENED_ARTS.moves.roundhouse). Past `window` s with no
// press the chain starts again at the cross. A charge let go inside `perfect` (seconds of charge past `tapGrace`) counts as
// full and strikes `perfectShare` times as hard; held longer it is full, without the bonus.
// 2026-11-14 (Tim: "charging should be reduced a little in general for the fists"): `chargeTime` 1.2 → .96 s and `perfect`
// [1, 1.3] → [.8, 1.04], the same ×.8 on both, so the perfect window keeps its place in the fill (it opens at 5/6 of full and
// closes just past it) and the ring reads as before. A fifth off: one beat of the rhythm goes from 1.33 s to 1.13 s, a change
// you feel in a combo without the charge turning into a tap. Gathered Breath glyphs (glyphs.ts CHARGE_GLYPH) shorten it
// further: the charge records its multiplier as it starts (`scale`), and fistHeld turns the time held into charge time.
export const IRON_FISTS = {
  base: 10, perPower: 1.2, window: .9, gate: .21, buffer: .12, finisher: 1.5, finisherStun: .8, tapGrace: .12, chargeTime: .96, guardMs: 220,
  perfect: [.8, 1.04], perfectShare: 1.25,
  beat: [1, 1.3], beatShare: 1.25, rhythmBonus: 13, flashMs: 180,
  punches: [
    { name: "Right cross", share: 1.4, chargeShare: 2.2, dash: 0, radius: 1.3, rush: 4, stop: .9 }, // release 491: rushes to a foe within `rush` tiles (to `stop` from it); none in range, it lands in place
    { name: "Left jab", share: .9, chargeShare: 1.2, echoes: 1, dash: .6, radius: 1.1 },
    { name: "Right uppercut", share: 2.4, chargeShare: 1.6, echoes: 2, dash: .3, radius: 1.4, stun: .5 },
  ],
};
// Release 503 (Tim: "if you have echo... it'll let you power up your second swing... it'll still... do the small... forward
// motion step... If you put a second [echo] in there your third swing [can] be charged... as well"): with `echoes` Echo glyphs
// in the Iron Fists' sockets, that punch can be held and charged too (`chargeShare` more at full charge). Without them it is
// thrown at once, as before.
// Release 503 (Tim: Echo on Shadow Boxing "spawns a shadow clone for 3 seconds... that only does melee attacks"): `echoClone`.
// Release 507 (Tim: "the first echo should be a second hammer. The second echo should be a third hammer... Bang bang boom...
// slightly after each other"): each Echo copy of Hammerfall or Great Sweep lands `toolGap` s after the one before.
export const BRAWLER_ECHO = { echoClone: 3, cloneArc: { shape: "arc", range: 1.75, arc: 160 }, toolGap: .22 };
// How charged the dash punch is after `held` seconds of holding (0..1).
export const fistCharge = (held) => Math.max(0, Math.min(1, (held - IRON_FISTS.tapGrace) / IRON_FISTS.chargeTime));
// Whether a charge let go after `held` seconds of holding falls in the perfect window.
export const fistPerfect = (held) => { const c = held - IRON_FISTS.tapGrace; return c >= IRON_FISTS.perfect[0] && c <= IRON_FISTS.perfect[1]; };
// The charge seconds (as fistCharge and fistPerfect read them) of the charge `c` ({ start, scale }) at `now` (ms): the tap grace
// runs at its own pace, the charge past it `1 / scale` times as fast (Gathered Breath).
export const fistHeld = (c, now) => { const h = Math.max(0, ((Number(now) || 0) - (Number(c?.start) || 0)) / 1000), k = Number(c?.scale) > 0 ? Math.min(1, c.scale) : 1; return h <= IRON_FISTS.tapGrace ? h : IRON_FISTS.tapGrace + (h - IRON_FISTS.tapGrace) / k; };

// The rhythm (Tim, 2026-11-14: "the ball extends from his body and comes back to the centre, and whenever it reaches his body,
// hitting Attack at that moment is the perfect timing... charge the punch, let it go, then start the next charge at the perfect
// timing... that should do the most damage. It should not be behind spamming"). After every step the gauntlet ball goes out
// along the blow and comes home to the Wayfarer's centre; it reaches home as the beat window opens, `beat`[0] × the gate after
// the step was thrown (never before the gate itself opens), and stays home, glowing, until `beat`[1] × the gate. A fresh press
// inside that window is on the beat: the step strikes `beatShare` times as hard. A press made earlier and held over by the gate
// or the attack buffer (mashing) is never on the beat. Starting a charge on the beat carries the beat into the charged blow, and
// a charge started on the beat and let go in its own perfect window (`perfect` above) is a rhythm blow: the step's on-beat tap
// (with the finisher, if it is one) plus `rhythmBonus` × the fists' power, in place of the charge's shares.
// Why a flat bonus, and why 13: the rhythm costs a charge (tapGrace + perfect[0] = .92 s) on top of the beat (.21 s) for every
// step, about 4.8 taps' time (each step also pays the press and let-go frames). A bonus in proportion to the step's share would
// pay most on the big steps, so tapping the cross and jab and charging only the uppercut and kick would beat charging every
// move; a flat bonus is worth the same on every step, so once it is at least the mean on-beat tap × (4.8 - 1) (about 10.3 with
// the kick, 9.3 without) charging every step is the best of every mix. 13 puts the full rhythm about 18% above perfect taps at
// every window's start (the fastest taps possible) with the awakened kick and about 28% without it (r953 follow-up, after the
// charge was cut to .96 s; it was 16 at 1.2 s, the same edge); tests/fist-rhythm.test.ts measures it with the real loop at 60
// fps. A player 30 ms late per step loses about a tenth on taps and 3% on the rhythm, so in hand the lead only grows. Gathered
// Breath (glyphs.ts CHARGE_GLYPH) shortens the charge and so widens the lead on purpose: with three, about 2.2 times taps.
// The beat window after a step thrown at `at` (ms) whose gate opens at `gateOpens` (ms).
export function fistBeatWindow(at, gateOpens = at + IRON_FISTS.gate * 1000) {
  const g = IRON_FISTS.gate * 1000, opens = Math.max(at + g * IRON_FISTS.beat[0], gateOpens);
  return { opens, closes: opens + g * (IRON_FISTS.beat[1] - IRON_FISTS.beat[0]) };
}
// Whether a press at `now` (ms) falls in the beat window `beat` ({ opens, closes }).
export const fistOnBeat = (beat, now) => !!beat && Number.isFinite(beat.opens) && now >= beat.opens - 1e-6 && now <= beat.closes + 1e-6;
// The ball at `ms` after the step (home at `homeMs`, the window's start; gone after `closesMs`, its end): `along` is how far out
// along the blow (FIST_STEP_VIEW.reach at full), `side` how far toward the striking shoulder (0 at home), `home` whether it is
// back at the centre. One shared record (no allocation per frame); null once the window has closed.
const BALL = { along: 0, side: 0, home: false };
export function fistBallAt(ms, homeMs, closesMs) {
  const V = FIST_STEP_VIEW; if (!(ms >= 0) || !(homeMs > 0) || !(ms <= closesMs)) return null;
  const u = ms / homeMs;
  if (u >= 1) { BALL.along = 0; BALL.side = 0; BALL.home = true; }
  else if (u < V.windup) { const q = u / V.windup; BALL.along = -V.back * q; BALL.side = q; BALL.home = false; }
  else if (u < V.strike) { const q = (u - V.windup) / (V.strike - V.windup); BALL.along = -V.back + (V.reach + V.back) * q; BALL.side = 1; BALL.home = false; }
  else { const q = (u - V.strike) / (1 - V.strike); BALL.along = V.reach * (1 - q); BALL.side = 1 - q; BALL.home = false; }
  return BALL;
}

// Presentation only: the original effect owns delay, contact, expiry and Echo identity.
// Conjure below the local roof/arch rather than pretending to fall from a ceiling.
export function hammerfallPresentation(fx, map) {
  if (fx?.kind !== 'hammerfall' || !fx.brawler || !Number.isFinite(fx.delay) || !Number.isFinite(fx.life) || fx.life <= 0) return null;
  let ceiling = interiorCeilingHeight(map) - .15;
  for (const dx of [-.45, 0, .45]) for (const dy of [-.2, 0, .2])
    if (interiorArchAt(map, fx.x + dx, fx.y + dy)) ceiling = Math.min(ceiling, INTERIOR_TRAVERSAL.archClearance - .15);
  const scale = Math.min(1, Math.max(0, ceiling / 1.25));
  const remaining = Math.max(0, Math.min(1, fx.delay / BRAWLER.hammerfall.delay));
  // An Echo waits through its extra delay, then runs its own same descent.
  const lift = Math.min(1.1, Math.max(0, ceiling - 1.25 * scale)) * (2 * remaining - remaining * remaining);
  const struck = (fx.pulseIndex || 0) > 0;
  return {kind:'hammerfallConjuration', x:fx.x, y:fx.y, supportX:fx.x, supportY:fx.y,
    lift, scale, yaw:0, pose:'idle', pace:0, alpha:struck ? Math.max(0, Math.min(1, fx.life / BRAWLER.hammerfall.lifetime)) : 1};
}
function drawFallingHammer(ctx, x, y, s, delay) {
  const hy = y - s * 2.2 * Math.max(0, delay / BRAWLER.hammerfall.delay), w = s * .9, h = s * .5;
  ctx.fillStyle = '#e8d3a2'; ctx.strokeStyle = '#5a4628'; ctx.lineWidth = 2;
  ctx.fillRect(x - w / 2, hy - h, w, h); ctx.strokeRect(x - w / 2, hy - h, w, h);
  ctx.fillStyle = '#8a6a3e'; ctx.fillRect(x - s * .06, hy - h - s * .8, s * .12, s * .8);
}

// Jump attacks (Tim, 2026-11-12: "All the weapons should have a jump attack. If you hit the weapon button when you're in the
// air, you slam down to the ground. And if you have Shadow Boxing running, you do a charge dive towards the nearest enemy and
// an explosion on impact"). game.ts runs them (tryPlunge, plungeSteer, plungeLand); drawBrawler below draws the rings.
// PLUNGE: Attack in the air (a jump, not mounted, in the robot, the drone, a boat, a glide or the water) drops the Wayfarer to
//   the ground below in `dropMs` (never longer than the jump had left) with no steering; on landing a slam hits every foe in the
//   weapon's `radius` for `share` × a normal hit (Game.plungeHit: the same weapon, melee bonus and multipliers a swing uses) and
//   staggers them `stun` s (a quarter of that for bosses and elites, as Hammerfall). One per jump; after it, `recoverMs` with no
//   attack, no jump and no walking (a dodge is never held back). The landing is the jump's own: falls, sky-hop gaps and roof
//   decks settle exactly as they would have, so fall damage is never negated. A plunge in progress is not saved: on reload the
//   jump that is left lands as an ordinary jump (no slam).
// PLUNGE_PROFILES: keyed by the weapon's PRIMARY_PROFILES key (items.ts); a weapon not listed (a new one) uses `default`.
// PLUNGE_DIVE: with Shadow Boxing running, the air attack is a charging dive to the locked foe (else the nearest auto-aim foe
//   within `range` tiles): the Wayfarer flies to it at `speed` tiles a second through the collision mover (walls and lethal
//   ground stop it, as Shadow Boxing's carries do; never more than `maxMs`), lands `stop` tiles from it, slams as the weapon
//   does and bursts: a second blast of `burstShare` × a normal hit in `burstRadius`, staggering `burstStun` s. Shadow Boxing's
//   damage and heal ride on both blows, its guard on blows taken. No foe in range: the ordinary plunge.
export const PLUNGE = { dropMs: 160, recoverMs: 340, slamLife: .3 };
export const PLUNGE_PROFILES = {
  default: { radius: 1.5, share: 1.4, stun: .35 },
  "salvage-blade": { radius: 1.5, share: 1.4, stun: .35 },
  "primary-verge-cleaver": { radius: 1.8, share: 1.6, stun: .45 },
  "primary-cinder-pike": { radius: 1.4, share: 1.3, stun: .3 },
  "primary-iron-fists": { radius: 1.6, share: 1.5, stun: .4 },
};
export const PLUNGE_DIVE = { range: 7, speed: 16, maxMs: 520, stop: .85, burstRadius: 1.6, burstShare: .9, burstStun: .4, burstLife: .35 };
// The profile for a weapon kind (a PRIMARY_PROFILES key), falling back to `default`.
export const plungeProfile = (kind) => Object.prototype.hasOwnProperty.call(PLUNGE_PROFILES, kind) ? PLUNGE_PROFILES[kind] : PLUNGE_PROFILES.default;
// The weapon kind (PRIMARY_PROFILES key) of an equipped primary, as primaryProfile resolves it.
export function plungeKind(item) { const q = primaryProfile(item); for (const k in PRIMARY_PROFILES) if (PRIMARY_PROFILES[k] === q) return k; return "default"; }
function drawPlunge(ctx, fx, x, y, R) {
  if (fx.kind === "plunge-slam") { // a dust ring thrown out from the landing
    const k = Math.max(0, Math.min(1, fx.life / PLUNGE.slamLife)); ctx.globalAlpha = k;
    ctx.fillStyle = "#c9b08a55"; ctx.beginPath(); ctx.arc(x, y, R * (1.05 - .35 * k), 0, 7); ctx.fill();
    ctx.strokeStyle = "#f2e2c2"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R * (1.15 - .45 * k), 0, 7); ctx.stroke();
    ctx.strokeStyle = "#8a7354"; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + .3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .35, y + Math.sin(a) * R * .35); ctx.lineTo(x + Math.cos(a) * R * (1 - .3 * k), y + Math.sin(a) * R * (1 - .3 * k)); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (fx.kind === "plunge-burst") { // Shadow Boxing's violet burst
    const k = Math.max(0, Math.min(1, fx.life / PLUNGE_DIVE.burstLife)); ctx.globalAlpha = k;
    ctx.fillStyle = "#9b5cff55"; ctx.beginPath(); ctx.arc(x, y, R * (1.1 - .5 * k), 0, 7); ctx.fill();
    ctx.strokeStyle = "#e6d2ff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, R * (1.2 - .5 * k), 0, 7); ctx.stroke();
    ctx.strokeStyle = "#7a3cff"; ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .25, y + Math.sin(a) * R * .25); ctx.lineTo(x + Math.cos(a) * R * (1.2 - .4 * k), y + Math.sin(a) * R * (1.2 - .4 * k)); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

// Spinosaur's Echo (echoes.ts SPINO_ECHO, plungeAfterimage): the afterimage slam's look. While it waits (`delay`) a pale
// afterimage of the Wayfarer fades in over the spot and brings the blow down, striking as the delay runs out (`strikeAt`, the
// share of Close View's hammer-stomp pose where the stomp lands); then a ghostly ring and the afterimage fade with the slam's
// life. `alpha` is the afterimage's greatest opacity, `waitAlpha` the dashed mark of where it will land. In Close View the
// afterimage is the Wayfarer's own hammer-stomp model, tinted as the Shadow Clone's (`shadow`), through captureActor.
export const PLUNGE_AFTERIMAGE_VIEW = { alpha: .55, fadeIn: .35, waitAlpha: .35, strikeAt: .53, body: "#cfe6ffcc", ring: "#bfe4ff", fill: "#9fd0ff40", spoke: "#7fb6e6" };
// 0..1: how far through the stomp the afterimage is; and its opacity (0 once the slam has faded).
export function plungeAfterimagePose(fx) {
  const V = PLUNGE_AFTERIMAGE_VIEW, wait = Math.max(1e-6, Number(fx.delayMax) || 0), life = Math.max(1e-6, Number(fx.lifeMax) || PLUNGE.slamLife);
  if (fx.delay > 0) { const k = Math.max(0, Math.min(1, 1 - fx.delay / wait)); return { amount: V.strikeAt * k, alpha: V.alpha * Math.min(1, V.fadeIn + (1 - V.fadeIn) * k) }; }
  const k = Math.max(0, Math.min(1, fx.life / life));
  return { amount: V.strikeAt + (1 - V.strikeAt) * (1 - k), alpha: V.alpha * k };
}
// The standard view's afterimage: a pale figure with the blow raised overhead (`amount` 0) brought down to the ground (strikeAt).
function drawAfterimageBody(ctx, x, y, s, amount, alpha) {
  const V = PLUNGE_AFTERIMAGE_VIEW, down = Math.max(0, Math.min(1, amount / V.strikeAt)), crouch = s * .08 * down;
  ctx.globalAlpha = alpha; ctx.fillStyle = V.body; ctx.strokeStyle = V.body; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - s * .2, y + s * .34); ctx.quadraticCurveTo(x - s * .24, y - s * .08 + crouch, x - s * .1, y - s * .18 + crouch); ctx.lineTo(x + s * .1, y - s * .18 + crouch); ctx.quadraticCurveTo(x + s * .24, y - s * .08 + crouch, x + s * .2, y + s * .34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - s * .3 + crouch, s * .13, 0, 7); ctx.fill();
  const hy = y - s * (.75 - 1.05 * down) + crouch;
  ctx.lineWidth = Math.max(1, s * .08); ctx.beginPath(); ctx.moveTo(x - s * .12, y - s * .14 + crouch); ctx.lineTo(x, hy); ctx.lineTo(x + s * .12, y - s * .14 + crouch); ctx.stroke();
  ctx.lineCap = "butt"; ctx.globalAlpha = 1;
}
function drawAfterimage(ctx, fx, x, y, R, s, capture) {
  const V = PLUNGE_AFTERIMAGE_VIEW, pose = plungeAfterimagePose(fx);
  if (fx.delay > 0) { ctx.globalAlpha = V.waitAlpha; ctx.strokeStyle = V.ring; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  else {
    const k = Math.max(0, Math.min(1, fx.life / Math.max(1e-6, Number(fx.lifeMax) || PLUNGE.slamLife))); ctx.globalAlpha = .8 * k;
    ctx.fillStyle = V.fill; ctx.beginPath(); ctx.arc(x, y, R * (1.05 - .35 * k), 0, 7); ctx.fill();
    ctx.strokeStyle = V.ring; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R * (1.15 - .45 * k), 0, 7); ctx.stroke();
    ctx.strokeStyle = V.spoke; ctx.lineWidth = 1.5; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + .6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .35, y + Math.sin(a) * R * .35); ctx.lineTo(x + Math.cos(a) * R * (1 - .3 * k), y + Math.sin(a) * R * (1 - .3 * k)); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (!(pose.alpha > 0)) return;
  // Close View: the Wayfarer's hammer-stomp model as a Shadow-Clone-tinted afterimage (its flat sprite if the model is refused)
  const captured = capture?.captureActor?.({ source: fx, x: fx.x, y: fx.y + .37, height: 2,
    draw: (c, unit) => { const q = plungeAfterimagePose(fx); drawAfterimageBody(c, fx.x * unit, fx.y * unit, unit, q.amount, q.alpha); },
    sample: () => { const q = plungeAfterimagePose(fx); return { kind: "playerHammerStomp", x: fx.x, y: fx.y + .37, yaw: Number.isFinite(fx.aimX) && Number.isFinite(fx.aimY) && (fx.aimX || fx.aimY) ? Math.atan2(fx.aimY, fx.aimX) : 0, shadow: true, alpha: q.alpha, pose: "attack", amount: q.amount, pace: 0 }; } });
  if (!captured) drawAfterimageBody(ctx, x, y, s, pose.amount, pose.alpha);
}

// The gauntlet ball (2026-11-13; the rhythm cue from 2026-11-14): which hand throws the step, so the chain reads right, left,
// right (the kick straight out along its aim). The ball is drawn back toward the striking shoulder (the wind-up), driven out
// along the aim to full reach as the blow lands (`strike` × the home time: the 90 ms contact of a .21 s gate) and brought home
// to the Wayfarer's centre exactly as the beat window opens (fistBallAt, keyed on game.fistBeat, the same record the press is
// judged by). It stays home with a glow until the window closes; a press on the beat flashes a ring round it. Drawn on the
// floor, so both views show it: Close View projects this layer onto its ground, so there home is under the hero's feet
// (`footY`, as close-view.ts stands him) rather than the sprite's middle (`bodyY`). Reduced motion and safe mode keep the ball and
// its glow but drop the pulse and the ring's spread. Nothing allocated.
export const FIST_STEP_VIEW = { windup: .28, strike: .43, shoulder: .22, reach: .62, back: .12, rise: .38, size: .11, arm: "#5a4636", fist: "#e4ebf2", rim: "#8796a6", glow: "#fff2a8", rhythm: "#ffd36a", halo: .3, flash: .55, bodyY: .45, footY: .75 };
function drawFistStep(ctx, game, toScreen, s, floor = false) {
  const p = game.player, b = game.fistBeat, now = game.lastUpdateNow || 0, V = FIST_STEP_VIEW;
  const still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), [cx, cy] = p ? toScreen({ x: p.x + .5, y: p.y + (floor ? V.footY : V.bodyY) }) : [0, 0];
  const f = game.fistFlash, fk = f && p ? (now - f.at) / IRON_FISTS.flashMs : 2;
  if (fk >= 0 && fk < 1) { // a press on the beat: a ring round the ball, gold for a rhythm blow
    ctx.globalAlpha = 1 - fk; ctx.strokeStyle = f.rhythm ? V.rhythm : V.glow; ctx.lineWidth = f.rhythm ? 4 : 3;
    ctx.beginPath(); ctx.arc(cx, cy, s * (still ? V.flash : V.halo + (V.flash - V.halo) * fk), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (!b || !p) return;
  const q = fistBallAt(now - b.at, b.opens - b.at, b.closes - b.at); if (!q) return;
  const ux = Number(b.ax) || 0, uy = Number(b.ay) || 0, step = Number(b.step) || 1, side = step === 2 ? -1 : step > 3 ? 0 : 1, rx = -uy * side, ry = ux * side;
  const sx = cx + rx * V.shoulder * s, sy = cy + ry * V.shoulder * s, out = Math.max(0, q.along) / V.reach, lift = step === 3 ? V.rise * s * out : 0;
  const fx = cx + rx * V.shoulder * s * q.side + ux * q.along * s, fy = cy + ry * V.shoulder * s * q.side + uy * q.along * s - lift;
  if (q.home) { // home: the beat window is open
    const pulse = still ? 1 : .75 + .25 * Math.sin((now - b.opens) / 1000 * Math.PI * 2 / (IRON_FISTS.gate * (IRON_FISTS.beat[1] - IRON_FISTS.beat[0])));
    ctx.globalAlpha = .28 * pulse; ctx.fillStyle = V.glow; ctx.beginPath(); ctx.arc(cx, cy, V.halo * s, 0, 7); ctx.fill();
    ctx.globalAlpha = .9; ctx.strokeStyle = V.glow; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, V.halo * s * (still ? 1 : .9 + .1 * pulse), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (side && q.side > 0) { ctx.strokeStyle = V.arm; ctx.lineWidth = Math.max(2, s * .07); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(fx, fy); ctx.stroke(); ctx.lineCap = "butt"; }
  ctx.fillStyle = q.home ? V.glow : V.fist; ctx.strokeStyle = V.rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx, fy, V.size * s * (q.home ? 1.25 : 1), 0, 7); ctx.fill(); ctx.stroke();
}
// Drawing (called from combat-visuals.ts with its screen transform). `t` is seconds.
export function drawBrawler(ctx, game, toScreen, s, t, capture = null) {
  for (const fx of game.effects) {
    if (!fx.brawler) continue;
    const [x, y] = toScreen(fx), R = fx.radius * s;
    if (fx.kind === "hammerfall") {
      const native = hammerfallPresentation(fx, game.map);
      const captured = native && capture?.captureActor?.({source:fx, x:fx.x, y:fx.y, height:2.4,
        sample:()=>hammerfallPresentation(fx, game.map),
        draw:(c, unit)=>{if(fx.delay > 0)drawFallingHammer(c, fx.x * unit, fx.y * unit, unit, fx.delay);}});
      ctx.strokeStyle = "#ffd58a99"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); ctx.setLineDash([]); // where it lands
      if (fx.delay > 0) { // the hammer head comes down
        if (!captured) drawFallingHammer(ctx, x, y, s, fx.delay);
      } else { // the shock ring
        const k = Math.max(0, fx.life / .25); ctx.globalAlpha = k; ctx.strokeStyle = "#ffe2a8"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R * (1.15 - .4 * k), 0, 7); ctx.stroke();
        ctx.fillStyle = "#ffcf7a44"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
    } else if (fx.kind === "great-sweep") {
      const k = Math.max(0, fx.life / .3), a0 = (1 - k) * Math.PI * 2;
      ctx.strokeStyle = "#dfe8f0"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.globalAlpha = .85 * k + .15; ctx.beginPath(); ctx.arc(x, y, R * .85, a0 - 1.6, a0); ctx.stroke();
      ctx.strokeStyle = "#9fc4e0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R, a0 - 2.4, a0); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt";
    } else if (fx.kind === "fist-uppercut") { // release 489: a blow that rises
      const k = Math.max(0, fx.life / .3); ctx.globalAlpha = k; ctx.strokeStyle = fx.finisher ? "#fff0b8" : "#ffd08a"; ctx.lineWidth = fx.finisher ? 6 : 4; ctx.lineCap = "round";
      for (const o of [-.35, 0, .35]) { ctx.beginPath(); ctx.moveTo(x + o * R, y + R * .4); ctx.lineTo(x + o * R * .5, y - R * (1.1 - .5 * k)); ctx.stroke(); }
      if (fx.finisher) { ctx.fillStyle = "#ffcf7a44"; ctx.beginPath(); ctx.arc(x, y, R * 1.1, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.lineCap = "butt";
    } else if (fx.kind === "fist-kick") { // 2026-11-13: the awakened fists' roundhouse sweeps round her
      const k = Math.max(0, fx.life / .3), still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), a0 = still ? 0 : (1 - k) * Math.PI * 2.4;
      ctx.globalAlpha = .3 * k; ctx.fillStyle = "#9ff0ff"; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.globalAlpha = k; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(x, y, R * .85, a0 - 2.2, a0); ctx.stroke();
      ctx.strokeStyle = "#9ff0ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R, a0 - 3, a0); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt";
    } else if (fx.kind === "iron-fist") {
      const k = Math.max(0, fx.life / .25); ctx.globalAlpha = k; ctx.fillStyle = "#ffb05a55"; ctx.beginPath(); ctx.arc(x, y, R * (1.1 - .3 * k), 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffe0b0"; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .4, y + Math.sin(a) * R * .4); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (fx.kind === "plunge-slam" || fx.kind === "plunge-burst") drawPlunge(ctx, fx, x, y, R); // jump attacks
    else if (fx.kind === "plunge-afterimage") drawAfterimage(ctx, fx, x, y, R, s, capture);
  }
  drawFistStep(ctx, game, toScreen, s, capture != null); // Close View passes its capture (the floor layer)
  const c = game.fistCharge;
  if (c) { // charging: a ring tightening round the Wayfarer, brighter as it fills; the perfect window marked on it, flashing inside it
    const [x, y] = toScreen({ x: game.player.x + .5, y: game.player.y + .45 }), held = fistHeld(c, game.lastUpdateNow || 0), k = fistCharge(held), F = IRON_FISTS;
    const span = F.perfect[1], fill = Math.max(.05, Math.min(1, (held - F.tapGrace) / span)), perfect = fistPerfect(held), R = s * (1.2 - .5 * k), top = -Math.PI / 2;
    ctx.globalAlpha = .35; ctx.strokeStyle = "#3a2c20"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); // the track
    ctx.globalAlpha = .9; ctx.strokeStyle = "#fff2a8"; ctx.beginPath(); ctx.arc(x, y, R, top + Math.PI * 2 * F.perfect[0] / span, top + Math.PI * 2); ctx.stroke(); // the perfect window
    ctx.strokeStyle = perfect ? "#fff6d8" : k >= 1 ? "#ffe9b0" : "#ffb05a"; ctx.lineWidth = 2 + 3 * k; ctx.globalAlpha = .5 + .4 * k; ctx.beginPath(); ctx.arc(x, y, R, top, top + Math.PI * 2 * fill); ctx.stroke();
    if (perfect) { ctx.globalAlpha = .6; ctx.strokeStyle = "#fff2a8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 1.14, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}
