import { interiorCeilingHeight, interiorArchAt, INTERIOR_TRAVERSAL } from './vehicle-gates.js?v=r1027-968515978119';
import { PRIMARY_PROFILES, primaryProfile } from './items.js?v=r1027-968515978119';
import { sweepIndicator, drawSweepSwing } from './great-sweep.js?v=r1027-968515978119';
import { sampleCycloneMotion } from './action-motion.js?v=r1027-968515978119'; // the Cyclone Heel's motion, shared with Close View
const SWEEP_DRAW = {}; // reused each frame

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
// The awakened Hammerfall's clap (Tim, 2026-11-14: "when the hammer hits, two lines of energy shoot out and then come back in
// and slap... in addition to the blows from the hammer falling. So you just have one and it'll slap"; then: "two lines move
// apart, 2 parallel lines move apart and then come back together"). An awakened Hammerfall tool (constellation.ts awaken on
// the secondary) adds one effect of kind "hammer-clap" to each press (game.ts brawlerTool; Echo copies of the hammer and the
// Shadow Clone add none). It waits with the hammer (`delay`: the hammer's own) and then runs on the effect's own clock, so it
// is saved and resumed with the area's effects like the hammer itself. Two straight lines of energy, `length` tiles long, lie
// along the aim, centred on the impact:
//   `extend` s: they appear together on the impact and slide apart sideways, parallel all the way, to `spread` tiles each side;
//   `hold` s: they hang there, humming;
//   `sweep` s: they slam back together onto the centre line: the clap. It strikes once (one pulse), every foe in the rectangle
//     between them: within `length` / 2 of the impact along the aim and `spread` across it, each padded by `width` (the
//     line's half-thickness) and the foe's body. `share` of the tool's power (Game.toolPower, as the hammer's blow), a `stun`
//     (a quarter of it on bosses and elites, as the hammer);
//   `fade` s: the shut lines and the flash of the slap along them fade.
// Walls (Tim, 2026-11-14: release 968 follow-up). The lines never pass a wall: when the clap is laid (game.ts clapClip), the
// centre line is cut where a wall stops it, each way from the impact (`back`, `fore` on the effect, at most `length` / 2), and at
// `samples` points along it each line's sideways travel is cut at the first wall (`out` on the effect: `samples` numbers for the
// side of negative across (hammerClapOut), then as many for positive, each at most `spread`). The clip is stored on the effect, so a resumed
// clap keeps its shape. A line is drawn through its clipped points, bending where a wall stops part of it; it still slams shut
// along its whole length. Only foes inside the clipped band are struck (the nearer of the two samples about them), and only
// those the game can see from the centre line (game.ts clapClear): never one past a wall.
// Pull: while the lines close, each foe in the band is drawn toward the centre line at `pull` tiles a second (never past it),
// through the collision mover (walls, bodies and lethal ground stop it); foes that hold their ground (weapon-arts.ts
// artAnchored: bosses, elites, world beasts...) are not moved.
// Pure numbers and geometry; drawHammerClap below draws it on the floor (both views: Close View projects this layer).
export const HAMMER_CLAP = Object.freeze({ share: .6, length: 2.88, spread: 1.5, width: .3, extend: .12, hold: .1, sweep: .1, fade: .2, stun: .3,
  pull: 4, samples: 9, step: .25,
  colors: Object.freeze({ glow: "#ffcf7a", core: "#fff6dc", band: "#ffd58a", flash: "#fffbe8" }),
  text: "when the hammer lands, two parallel lines of energy slide apart from it and slam back together, drawing foes in" });
// When the clap strikes and how long it lasts, from the moment the hammer lands (seconds).
export const hammerClapStrikeAt = () => HAMMER_CLAP.extend + HAMMER_CLAP.hold + HAMMER_CLAP.sweep;
export const hammerClapSpan = () => hammerClapStrikeAt() + HAMMER_CLAP.fade;
// How far the clap `fx` reaches along the aim behind (-1) or ahead of (+1) the impact: its clip, else half its length.
export const hammerClapEnd = (fx, dir) => { const v = dir < 0 ? fx.back : fx.fore, half = fx.radius / 2; return Number.isFinite(v) ? Math.max(0, Math.min(half, v)) : half; };
// Where along the aim sample `i` of the clap lies (from the impact).
export const hammerClapSampleAt = (fx, i) => { const b = hammerClapEnd(fx, -1), f = hammerClapEnd(fx, 1), n = HAMMER_CLAP.samples; return -b + (b + f) * i / (n - 1); };
// How far the line on `side` (the sign of across = ry·ax − rx·ay, i.e. along ∓(−ay, ax)) travels out at sample `i`.
export const hammerClapOut = (fx, side, i) => { const spread = Number.isFinite(fx.spread) ? fx.spread : HAMMER_CLAP.spread, o = Array.isArray(fx.out) ? Number(fx.out[(side < 0 ? 0 : HAMMER_CLAP.samples) + i]) : NaN; return Number.isFinite(o) ? Math.max(0, Math.min(spread, o)) : spread; };
// Clip a clap against the map (game.ts calls it once, when the clap is laid). `open(x, y)`: whether a world point is open.
// Writes `back`, `fore` and `out` (one array of 2 × `samples`, made once here) on `fx`.
export function clipHammerClap(fx, open) {
  const C = HAMMER_CLAP, half = fx.radius / 2, nx = -fx.ay, ny = fx.ax, spread = Number.isFinite(fx.spread) ? fx.spread : C.spread;
  const run = (x, y, dx, dy, max) => { let d = 0; while (d + C.step <= max + 1e-9 && open(x + dx * (d + C.step), y + dy * (d + C.step))) d += C.step; if (d < max - 1e-9 && d + C.step > max && open(x + dx * max, y + dy * max)) d = max; return d; };
  fx.back = run(fx.x, fx.y, -fx.ax, -fx.ay, half); fx.fore = run(fx.x, fx.y, fx.ax, fx.ay, half); fx.out = new Array(2 * C.samples);
  for (let i = 0; i < C.samples; i++) {
    const a = hammerClapSampleAt(fx, i), px = fx.x + fx.ax * a, py = fx.y + fx.ay * a;
    fx.out[i] = run(px, py, -nx, -ny, spread); fx.out[C.samples + i] = run(px, py, nx, ny, spread);
  }
  return fx;
}
// The band's extent on `side` at `along` (the nearer of the two samples about it, so a wall between samples is never crossed).
export function hammerClapExtent(fx, side, along) {
  const b = hammerClapEnd(fx, -1), f = hammerClapEnd(fx, 1), n = HAMMER_CLAP.samples, span = b + f;
  if (!(span > 1e-9)) return hammerClapOut(fx, side, 0);
  const u = Math.max(0, Math.min(n - 1, (along + b) / span * (n - 1))), i = Math.floor(u), j = Math.min(n - 1, i + 1);
  return Math.min(hammerClapOut(fx, side, i), hammerClapOut(fx, side, j));
}
// Whether a foe whose middle is (ex, ey) is inside the clap `fx`'s band (x, y: the impact; ax, ay: the unit aim, along the
// lines): between the clipped ends along the aim and within the clipped travel of the line on its side, each padded by
// `width` (the line's half-thickness) and `body` (how much wider than a common foe it is, as updateEffects reckons radii).
export function hammerClapCatches(fx, ex, ey, body = 0) {
  const rx = ex - fx.x, ry = ey - fx.y, slack = HAMMER_CLAP.width + Math.max(0, Number(body) || 0);
  const along = rx * fx.ax + ry * fx.ay, across = ry * fx.ax - rx * fx.ay;
  if (along < -hammerClapEnd(fx, -1) - slack || along > hammerClapEnd(fx, 1) + slack) return false;
  return Math.abs(across) <= hammerClapExtent(fx, across < 0 ? -1 : 1, along) + slack;
}
// The lines' shape at `t` s after the hammer landed (null before it lands or once it has faded): `apart` (0..1 of the spread:
// 0 together on the centre line, 1 out at the spread), `flash` (1 at the slap, fading) and `phase`: "apart" (sliding out),
// "hold", "close" (slamming back) or "clap". Reuses one object (no allocation per frame).
const CLAP_POSE = { apart: 0, flash: 0, phase: "" };
export function hammerClapPose(t) {
  const C = HAMMER_CLAP, P = CLAP_POSE; if (!(t >= 0) || t > hammerClapSpan()) return null;
  if (t < C.extend) { const k = t / C.extend; P.apart = 1 - (1 - k) * (1 - k); P.flash = 0; P.phase = "apart"; }
  else if (t < C.extend + C.hold) { P.apart = 1; P.flash = 0; P.phase = "hold"; }
  else if (t < hammerClapStrikeAt()) { const k = (t - C.extend - C.hold) / C.sweep; P.apart = 1 - k * k; P.flash = 0; P.phase = "close"; }
  else { P.apart = 0; P.flash = Math.max(0, 1 - (t - hammerClapStrikeAt()) / C.fade); P.phase = "clap"; }
  return P;
}
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
// The dash's time for `tiles` of travel (ms). `D`: the clock's table (speed, minMs, maxMs): SHADOW_DASH, or another charge's
// own (LAVA_RUSH below, the Verge Cleaver's Lava Slash).
export function shadowDashMs(tiles, D = SHADOW_DASH) { const n = Number(tiles); return Math.max(D.minMs, Math.min(D.maxMs, Number.isFinite(n) && n > 0 ? 1000 * n / D.speed : 0)); }
// The share of the path covered at time fraction t: half linear, half smoothstep.
export function shadowDashTravel(t) { t = clamp01(t); return .5 * t + .5 * t * t * (3 - 2 * t); }
// The saved dash (playerRuntime.shadowDash, additive at schema 14). A valid version-1 record comes back clean; a newer one is
// kept as it is (opaque); anything else is null (the dash is dropped and the press with it, rather than resumed wrong).
export const finiteIn = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
// The fields every saved charge shares, checked against its own table D (v, minMs, maxMs, maxTiles): a valid record of D's
// version comes back clean (elapsed held to its duration, `arrived` a boolean), a newer one is kept opaque, anything else null.
export function normalizeDashCore(raw, D) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Number.isInteger(raw.v) && raw.v > D.v) return structuredClone(raw);
  if (raw.v !== D.v) return null;
  if (!['area', 'areaId', 'levelId', 'foe'].every((k) => typeof raw[k] === 'string' && raw[k].length <= 512)) return null;
  if (!finiteIn(raw.fromX, -1e4, 1e5) || !finiteIn(raw.fromY, -1e4, 1e5) || !finiteIn(raw.durationMs, D.minMs, D.maxMs) || !finiteIn(raw.elapsedMs, 0, D.maxMs)
    || !finiteIn(raw.travelled, 0, D.maxTiles) || !finiteIn(raw.stop, 0, 20)) return null;
  return { ...structuredClone(raw), elapsedMs: Math.min(raw.elapsedMs, raw.durationMs), arrived: raw.arrived === true };
}
export function normalizeShadowDash(raw) {
  const r = normalizeDashCore(raw, SHADOW_DASH); if (!r || r.v !== SHADOW_DASH.v) return r;
  r.action = raw.action === 'attack' ? 'attack' : null; return r;
}
// Cyclone Heel (Tim, 2026-11-15: "If you have the ki blast passive active and your Iron Fists are awakened: after the uppercut,
// while you're in the air, do the ki blast. Then if you hit the next button, it does a spinning leg kick: one leg out, spinning
// while travelling toward the enemy... If you have Shadow Boxing, you teleport there and all the spins' damage is applied on the
// enemy you teleported to, over a second or so"). Only with awakened Iron Fists AND the Ki Blast passive (weapon-arts.ts
// awakenedUp(save, "roundhouse")): still up in the Ki Blast's own leap (game.ts kiSlamReady: the uppercut released the blast and
// popped her up) and inside the chain's `window`, the next Attack press is the Cyclone Heel in place of Ki Blast's ground slam.
// Anything missing and the chain is exactly as before (the slam, or the ordinary plunge).
//   The press (game.ts cyclonePress). A tap (or a press with no button to hold) spins at once: the plain kick. Held, the
//     gauntlet ball (FIST_STEP_VIEW, game.fistBeat) goes out and comes home as the landing window opens: let go within
//     `window.lead` s before the predicted landing (the leap's jumpUntil), having held at least `window.grace` s, and it is a
//     perfect release. Let go earlier, or still held as she lands, and it is the plain kick (on the ground; never stuck: a
//     hold never outlasts the landing or `holdMs`).
//   The rewards are the chain's own (IRON_FISTS): perfect, every spin × `perfectShare`; a press made on the beat (the ball home
//     after the uppercut), every spin × `beatShare`; both (a rhythm release), every spin × `beatShare` plus `rhythmBonus` ×
//     fistPower shared over the spins: the flat bonus a rhythm step earns. The HUD meter (FIST_CALLOUT) takes the same level.
//   Target: the lock, else the nearest foe within `range` tiles (game.ts cycloneTarget), else forward along the aim.
//   The clock (2026-11-15 quality pass: "AAA feel... eased wind-up and recovery, readable spins with follow-through"): a
//     wind-up of `windupMs` (a beat of hang time while the knee chambers), the spin span, then `recoverMs` while the leg comes
//     down and the last turn runs out onto her heading. The record carries the phase lengths and the attack record their
//     shares (cycloneWindup, cycloneRecover), so both views draw the same motion (action-motion.ts sampleCycloneMotion):
//     continuous turning speed, whole turns, no pop (measured frame by frame in tests/fist-cyclone-kick.test.ts).
//   Without Shadow Boxing she travels through the spin span: to `stop` tiles short of a foe within reach (followed as it
//     steps), else `tiles` along the heading, through Shadow Boxing's quarter-tile mover (game.ts dashCarry: walls, bodies,
//     lethal ground and ledges stop it) on its own path, cycloneTravel: fast out and slowing in, so most of the ground is
//     covered in the first turns and the later turns drill into a foe met at the end. `spins` turns of `spinMs`; as each turn
//     ends the leg strikes every foe within `radius` of her centre at that moment (padded by the foe's body), once each (one
//     effect a turn): from 2.5 tiles away the last three of five land.
//   With Shadow Boxing and a foe within `shadow.reach`: a true blink to it (Tim, 2026-11-15), by Rift Step's rules (game.ts
//     cycloneBlink: quarter steps stood by blinkFooting, never up a ledge, through solid props, stopped by walls, hazards,
//     sealed gates and forbidden air; blinkPathClear), `shadow.stop` short. She leaves a vanish burst, a violet streak and
//     Shadow Boxing's after-images (markShadowTrail) and arrives in an arrival flash already part-chambered (`shadow.enter` of
//     the wind-up, so the body appears in the pose rather than popping into it). A blink that cannot get within `shadow.leash`
//     of its stop is not taken: the travelled kick instead. Then she spins in place for `shadow.spanMs`: every turn lands on
//     that foe (`only`) while she is within the leash of it, and foes touching the leg take `shadow.splash` of the turn. She
//     follows a stepping foe at up to `shadow.follow` tiles a second. Shadow Boxing's damage and heal ride on every turn.
//   The Shadow Clone (Tim, 2026-11-15) throws its arc swing with every turn, through the same hook as each chain step
//     (game.ts cloneSwing; its own share and rules).
//   Each turn: `share` × fistPower (the fists' power, glyph damage mods, Spellblade, armor), melee glyphs, Imbue, a `stun`.
//     5 × .6 = 3.0, a little over the slam's 2.8 it replaces. Echo glyphs add no copies (no fist step has Echo copies) and
//     do not gate the hold (it is a timing, not a charge). The press counts toward arming Ki Blast again (noteArtPress).
//   I-frames as the cross's rush: IRON_FISTS.guardMs from the start. A dodge, a stun, death, a new area or the fists put
//     away end it; the chain then starts again at the cross on its gate.
// Saved mid-spin at playerRuntime.cycloneHeel (additive, schema 14; normalizeDashCore's fields against `v`, `minMs`, `maxMs`,
// `maxTiles`) and resumed exactly; the hold (a held button) is runtime only and a reload drops it.
export const CYCLONE_HEEL = Object.freeze({
  v: 1, name: "Cyclone Heel", spins: 5, spinMs: 110, windupMs: 120, recoverMs: 170, tiles: 3.5, stop: .8, range: 6, radius: 1.3, share: .6, stun: .25,
  shadow: Object.freeze({ spanMs: 1000, reach: 8, stop: .85, follow: 3, splash: .35, leash: 1, enter: .6, blink: Object.freeze({ vanish: .7, arrive: 1, life: .3 }) }),
  window: Object.freeze({ lead: .22, grace: .12 }), holdMs: 1500,
  minMs: 300, maxMs: 1500, maxTiles: 8, maxSpins: 12, maxPhaseMs: 400, // the saved record's bounds
  colors: Object.freeze({ ring: "#9ff0ff", leg: "#ffffff", shadow: "#b48cff" }),
});
// The share of the travel covered at time fraction t: fast out, slowing in (ease-out).
export function cycloneTravel(t) { t = clamp01(t); return 1 - (1 - t) * (1 - t); }
export function normalizeCycloneHeel(raw) {
  const C = CYCLONE_HEEL, r = normalizeDashCore(raw, C); if (!r || r.v !== C.v) return r;
  if ((raw.mode !== "travel" && raw.mode !== "shadow") || !finiteIn(raw.toX, -1e4, 1e5) || !finiteIn(raw.toY, -1e4, 1e5) || !finiteIn(raw.dirX, -1, 1) || !finiteIn(raw.dirY, -1, 1)
    || !finiteIn(raw.limit, 0, C.maxTiles) || !Number.isInteger(raw.spins) || raw.spins < 1 || raw.spins > C.maxSpins || !Number.isInteger(raw.spun) || raw.spun < 0 || raw.spun > raw.spins
    || !finiteIn(raw.power, 0, 1e9) || !finiteIn(raw.splash, 0, 1e9) || ![0, 1, 2].includes(raw.level)
    || !finiteIn(raw.windupMs, 0, C.maxPhaseMs) || !finiteIn(raw.recoverMs, 0, C.maxPhaseMs) || raw.windupMs + raw.recoverMs >= raw.durationMs) return null;
  r.perfect = raw.perfect === true; r.enter = finiteIn(raw.enter, 0, 1) ? raw.enter : 0; return r;
}
// The standard view (and Close View's floor layer), on the same motion as the Close View body (action-motion.ts
// sampleCycloneMotion): the leg's line drawn round her as she turns, longer as it extends, a trailing arc whose length follows
// the turning speed (the follow-through visible as it shortens), and a faint disc of its reach that fades in with the wind-up
// and out with the recovery; violet with Shadow Boxing. Still (reduced motion, safe mode): the disc and the leg along the
// heading. No allocation.
const CYCLONE_DRAW = { stage: "", turn: 0, chamber: 0, extend: 0, weight: 0 };
function drawCycloneHeel(ctx, game, toScreen, s, floor) {
  const q = game.cycloneHeel, p = game.player; if (!q || q.v !== CYCLONE_HEEL.v || !p || !(q.durationMs > 0)) return;
  const C = CYCLONE_HEEL, K = C.colors, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), D = q.durationMs;
  const m = sampleCycloneMotion(q.elapsedMs / D, q.windupMs / D, q.recoverMs / D, CYCLONE_DRAW, undefined, q.enter); if (!(m.weight > 0)) return;
  const [x, y] = toScreen({ x: p.x + .5, y: p.y + (floor ? FIST_STEP_VIEW.footY : FIST_STEP_VIEW.bodyY) }), R = C.radius * s, tint = q.mode === "shadow" ? K.shadow : K.ring;
  const head = Math.atan2(q.dirY, q.dirX), a = still ? head : head + m.turn * Math.PI * 2, trail = still ? .4 : m.stage === "spin" ? 2.4 * m.extend : m.stage === "recover" ? 2.4 * m.weight : 0;
  ctx.globalAlpha = .18 * m.weight; ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
  ctx.lineCap = "round";
  if (trail > .05) { ctx.globalAlpha = .85 * m.weight; ctx.strokeStyle = tint; ctx.lineWidth = Math.max(2, s * .08); ctx.beginPath(); ctx.arc(x, y, R * .9, a - trail, a); ctx.stroke(); }
  const reach = R * (.35 + .55 * m.extend); ctx.globalAlpha = m.chamber; ctx.strokeStyle = K.leg; ctx.lineWidth = Math.max(2, s * .1);
  ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * .2, y + Math.sin(a) * R * .2); ctx.lineTo(x + Math.cos(a) * reach, y + Math.sin(a) * reach); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
}
// The Verge Cleaver's Lava Slash rush (weapon-arts.ts WEAPON_ARTS.arts["lava-slash"]; Tim, 2026-11-14: "The charged dash for
// the Verge Cleaver just lunges you, it teleports you to the enemy. It should be like the other dash moves"). The art's dash is
// travelled: game.ts artRushBegin records it (Game.artRush, saved with the journey at `v`), artRushSteer carries her along it on
// Shadow Boxing's eased path (shadowDashTravel) through the same quarter-tile mover (game.ts dashCarry: SHADOW_DASH.step,
// canStand and moveGuardedCombatStep), and artRushLand brings the slam and the eruption down on arrival. The art still picks its
// foe and its end as the old one-update dash did (whole quarter steps, `stop` short), so on open ground it ends where it ended.
// Released mid-jump it is the same rush (Tim, 2026-11-14): the jump's arc runs on by its own clock and the record's `air` holds
// until that jump lands; the slam lands where the rush ends.
//   Its own clock, shadowDashMs(tiles, LAVA_RUSH): ms = clamp(1000 x tiles / `speed`, `minMs`, `maxMs`). 16 tiles/s is two
//     thirds of Shadow Boxing's 24: a greatsword charge, heavier and longer to read, yet still six times a walk and over three
//     times a dodge; at 60 fps the body moves at most a third of a tile a frame (peak 1.25x the mean). The longest dash (a lock
//     at the art's `dash` + 1 tiles, less its `stop`: 4.1 tiles, 4 in whole steps) takes 250 ms, under `maxMs`; `minMs` 140 ms
//     (8 frames) is the shortest span that reads as travel. `maxTiles`: at most this far in one rush (the longest old dash and
//     a little for a foe stepping back).
//   Damage per second holds within a few percent of the one-update dash with no compensation (the charge's hold dominates
//   the cycle; measured in tests/cleaver-rush.test.ts), so no number of the art changed.
//   Drawn with SHADOW_DASH's ghosts, streak and pose in DASH_LOOKS.cleaver (ember and iron, never violet, no wraith).
export const LAVA_RUSH = Object.freeze({ v: 1, speed: 16, minMs: 140, maxMs: 280, maxTiles: 5 });
// The saved rush (playerRuntime.artRush, additive at schema 14): normalizeDashCore's shared fields against LAVA_RUSH, then its
// own: the art, the fixed end with no foe, the heading, the cap and the blow's power (fixed at the release). A valid version-1
// record comes back clean; a newer one is kept as it is (opaque); anything else is null (dropped, and no blow).
export function normalizeArtRush(raw) {
  const R = LAVA_RUSH, r = normalizeDashCore(raw, R); if (!r || r.v !== R.v) return r;
  if (raw.art !== "lava-slash" || !finiteIn(raw.toX, -1e4, 1e5) || !finiteIn(raw.toY, -1e4, 1e5) || !finiteIn(raw.dirX, -1, 1) || !finiteIn(raw.dirY, -1, 1)
    || !finiteIn(raw.limit, 0, R.maxTiles) || !finiteIn(raw.power, 0, 1e9)) return null;
  if (Object.hasOwn(raw, "air")) r.air = raw.air === true; // released mid-jump, until that jump lands (game.ts artRushSteer)
  return r;
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
// The charge in progress, if any: Shadow Boxing's (game.shadowDash) or the Verge Cleaver's Lava Slash (game.artRush, game.ts
// artRushBegin; weapon-arts.ts). Both carry fromX, fromY, elapsedMs, durationMs and arrived, and game.ts keeps only valid
// records of the current version on the game, so the drawing reads them alike.
function liveDash(game) {
  const q = game?.shadowDash; if (q?.v === SHADOW_DASH.v && !q.arrived) return q;
  const r = game?.artRush; return r && !r.arrived && r.durationMs > 0 ? r : null;
}
// Whose look the charge drawing wears now (DASH_LOOKS): the Cleaver's while its rush runs or settles, else Shadow Boxing's.
export function dashKind(game) {
  if (game?.shadowDash?.v === SHADOW_DASH.v && !game.shadowDash.arrived) return "shadow";
  if (game?.artRush && !game.artRush.arrived) return "cleaver";
  const a = game?.shadowDashAfter; return a?.live && a.kind === "cleaver" && !trailNow(game) ? "cleaver" : "shadow";
}
// The look of each kind of charge, both views. Shadow Boxing's is violet (and spectral: the wraith); the Verge Cleaver's
// Lava Slash rush (Tim, 2026-11-14: "like the other dash moves") is a subtle ember-and-iron streak and plain dark afterimages
// at `alpha` of SHADOW_DASH's, never violet, never a wraith. Close View's tints are close-view-shadow-forms.ts.
export const DASH_LOOKS = Object.freeze({
  shadow: Object.freeze({ streak: "#b99bff", body: "#6f4fc8", head: "#c9b2ff", alpha: 1, wraith: true }),
  cleaver: Object.freeze({ streak: "#e0874a", body: "#4a3a30", head: "#b89a7a", alpha: .55, wraith: false }),
});
// True while a trail is being drawn (renderer.ts draws its older single dodge ghost only when it is not).
export function shadowTrailLive(game) { const r = trailNow(game); return !!r && (r.moving || (game.lastUpdateNow || 0) - r.endAt < SHADOW_DASH.fadeMs); }
// The afterimages to draw now, nearest first, as [x, y, alpha] triples into `out` (a Float64Array of 3 × SHADOW_DASH.ghosts):
// during a dash (game.shadowDash) back along the path from where it set off to where the Wayfarer is, and for `fadeMs` after
// arrival (game.shadowDashAfter) closing in on the arrival point as they fade; the same for a shadow trail (above). Returns
// the count. Logical tile coordinates. No allocation.
export function shadowDashGhosts(game, out) {
  const D = SHADOW_DASH, q = liveDash(game), a = game?.shadowDashAfter, p = game?.player; let n = 0;
  if (!p || !out) return 0;
  let t, fx, fy, tx, ty, fade, denom, linear = false, r;
  const look = DASH_LOOKS[dashKind(game)].alpha;
  if (q) { t = q.elapsedMs / q.durationMs; fx = q.fromX; fy = q.fromY; tx = p.x; ty = p.y; fade = 1; denom = shadowDashTravel(Math.min(1, t)); }
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
    out[o] = fx + (tx - fx) * e; out[o + 1] = fy + (ty - fy) * e; out[o + 2] = D.alpha * (1 - k / (D.ghosts + 1)) * fade * look; n++;
  }
  return n;
}
// The charge pose weight (0..1): leaning in over the first `rampIn` of a dash, settling over `settleMs` after it. `wraith`:
// the spectral weight, 1 while charging and fading out as the body settles. A carry trail settles as an arrived charge; a
// dodge trail is live with no lean and no wraith.
export function shadowDashPose(game, out) {
  const D = SHADOW_DASH, q = liveDash(game), a = game?.shadowDashAfter, kind = dashKind(game), spectral = DASH_LOOKS[kind].wraith ? 1 : 0;
  out.live = false; out.charge = 0; out.wraith = 0; out.t = 1; out.kind = kind; out.moving = !!q;
  if (q) { out.live = true; out.t = clamp01(q.elapsedMs / q.durationMs); out.charge = smoothstep(out.t / D.rampIn); out.wraith = spectral; return out; }
  const r = trailNow(game);
  if (r) { const now = game.lastUpdateNow || 0;
    if (r.moving) { out.live = true; out.t = clamp01(Math.max(0, now - r.at) / r.durationMs); return out; }
    const after = Math.max(0, now - r.endAt); if (after < Math.max(D.settleMs, D.fadeMs)) { const c = r.pose ? 1 - smoothstep(after / D.settleMs) : 0; out.charge = c; out.wraith = c; out.live = after < D.fadeMs || c > 0; }
    return out; }
  if (a?.live) { const after = Math.max(0, (game.lastUpdateNow || 0) - a.at), s = Math.max(D.settleMs, D.fadeMs); if (after < s) { out.charge = 1 - smoothstep(after / D.settleMs); out.wraith = out.charge * spectral; out.t = 1; out.live = after < D.fadeMs || out.charge > 0; } }
  return out;
}
const DASH_GHOSTS = new Float64Array(SHADOW_DASH.ghosts * 3); // the drawing pool for drawBrawlerAuras
// Standard View's pose for the Verge Cleaver's Lava Slash rush (2026-11-14: "in both Standard View and Close View you should
// see the character charge"): the sprite tips `lean` radians into the heading (by its side-to-side share, so a rush up or down
// the screen barely tips), weighted by the charge pose (in over the first `rampIn`, out over `settleMs`), and the Cleaver is
// drawn carried low and trailing: a blade `len` tiles from the hand, `back` behind it and `low` below. No allocation.
export const RUSH_VIEW = Object.freeze({ lean: .26, len: .62, back: .42, low: .3, width: .08, steel: "#cfc6b8", edge: "#e0874a" });
const RUSH_POSE = { live: false, charge: 0, wraith: 0, t: 1, kind: "shadow", moving: false };
export function cleaverRushWeight(game) { const P = shadowDashPose(game, RUSH_POSE); return P.kind === "cleaver" && P.charge > 0 ? P.charge : 0; }
const HEADING = { x: 1, y: 0 }; // reused: the rush's heading (or the aim it left), no allocation
const rushHeading = (game) => { const q = game?.artRush, a = game?.player?.meleeAim; HEADING.x = q ? q.dirX : Number(a?.x) || (game?.player?.facing === "left" ? -1 : 1); HEADING.y = q ? q.dirY : Number(a?.y) || 0; return HEADING; };
export function cleaverRushLean(game) { const k = cleaverRushWeight(game); if (!(k > 0)) return 0; return RUSH_VIEW.lean * k * Math.max(-1, Math.min(1, rushHeading(game).x * 1.5)); }
export function drawCleaverRushBlade(ctx, game, s, lift = 0) {
  const k = cleaverRushWeight(game), p = game?.player; if (!(k > 0) || !p) return false;
  const V = RUSH_VIEW, H = rushHeading(game), l = Math.hypot(H.x, H.y) || 1, ux = H.x / l, uy = H.y / l;
  const hx = (p.x + .5 + ux * .12) * s, hy = (p.y + .62) * s - lift, tx = hx - ux * V.back * s, ty = hy - uy * V.back * s * .5 + V.low * s;
  const bx = hx + (tx - hx) * V.len / Math.max(.01, Math.hypot(V.back, V.low)), by = hy + (ty - hy) * V.len / Math.max(.01, Math.hypot(V.back, V.low));
  ctx.globalAlpha = k; ctx.lineCap = "round";
  ctx.strokeStyle = V.steel; ctx.lineWidth = Math.max(2, s * V.width); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = V.edge; ctx.lineWidth = Math.max(1, s * V.width * .35); ctx.beginPath(); ctx.moveTo(hx + (bx - hx) * .35, hy + (by - hy) * .35 + 1); ctx.lineTo(bx, by + 1); ctx.stroke();
  ctx.lineCap = "butt"; ctx.globalAlpha = 1; return true;
}
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
// Power Aegis (hit-cast-passives.ts POWER_AEGIS; game.ts perfectParry), drawn only: the parry's flash for `flashMs` from
// `game.parryFlashAt` (a gold-white ring bursting out with `rays` sparks; still, at reduced motion or in safe mode: one ring that
// fades where it stands), and while `game.powerAegisUntil` holds a gold glow round the Wayfarer with a glint at the weapon hand
// (steady when still). The reflect's hit (game.ts reflectBlow) flashes on the creature it struck for `flashMs` from
// `game.reflectFlashAt` at (`reflectFlashX`, `reflectFlashY`): a gold ring closing in with `rays` short sparks (still: one ring).
// Drawn in both views: Close View draws these auras on its floor. No allocation.
export const PARRY_LOOK = { flashMs: 380, rays: 8, ring: "#fff3c4", spark: "#ffd36b", glow: "#ffcf5a33", rim: "#ffd36b", glint: "#fff7dd" };
function drawPowerAegis(ctx, game, toScreen, s, t, now, x, y) {
  const L = PARRY_LOOK, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode);
  const ra = now - (Number(game.reflectFlashAt) || -1e9);
  if (ra >= 0 && ra < L.flashMs && Number.isFinite(game.reflectFlashX) && Number.isFinite(game.reflectFlashY)) {
    const k = ra / L.flashMs, [fx, fy] = toScreen({ x: game.reflectFlashX + .5, y: game.reflectFlashY + .45 }), r = s * (still ? .7 : 1.1 - .5 * k);
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = L.spark; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.stroke();
    if (!still) { ctx.strokeStyle = L.ring; ctx.lineWidth = 2; for (let i = 0; i < L.rays; i++) { const a = i * Math.PI * 2 / L.rays, r0 = r * .35, r1 = r * .8; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * r0, fy + Math.sin(a) * r0); ctx.lineTo(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }
  const age = now - (Number(game.parryFlashAt) || -1e9);
  if (age >= 0 && age < L.flashMs) {
    const k = age / L.flashMs, r = s * (still ? 1 : .9 + .7 * k);
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = L.ring; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    if (!still) { ctx.strokeStyle = L.spark; ctx.lineWidth = 2; for (let i = 0; i < L.rays; i++) { const a = i * Math.PI * 2 / L.rays + .3, r0 = r * 1.05, r1 = r * (1.25 + .25 * k); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }
  const left = (Number(game.powerAegisUntil) || 0) - now;
  if (left > 0) {
    const k = Math.min(1, left / 600), pulse = still ? 1 : .8 + .2 * Math.sin(t * 9); // fades over its last .6 s
    ctx.globalAlpha = (.3 + .4 * k) * pulse; ctx.fillStyle = L.glow; ctx.beginPath(); ctx.arc(x, y, s * .7, 0, 7); ctx.fill();
    ctx.strokeStyle = L.rim; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * .7, 0, 7); ctx.stroke();
    const f = game.save?.lastAim, m = Math.hypot(f?.x || 0, f?.y || 0) || 1, hx = x + (f?.x || 1) / m * s * .42, hy = y + (f?.y || 0) / m * s * .3; // the weapon hand, toward the aim
    ctx.globalAlpha = (.55 + .45 * k) * pulse; ctx.fillStyle = L.glint; ctx.strokeStyle = L.rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hx, hy, s * (still ? .11 : .09 + .03 * Math.sin(t * 14)), 0, 7); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }
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
  drawPowerAegis(ctx, game, toScreen, s, t, now, x, y);
  { const G = DASH_GHOSTS, n = shadowDashGhosts(game, G), L = DASH_LOOKS[dashKind(game)]; // a charge (Shadow Boxing's violet, the Cleaver's ember): a speed streak and afterimages along the path (every tier, safe mode too)
    if (n > 0) { const far = toScreen({ x: G[(n - 1) * 3] + .5, y: G[(n - 1) * 3 + 1] + .45 }); ctx.globalAlpha = .35 * G[2] / SHADOW_DASH.alpha; ctx.strokeStyle = L.streak; ctx.lineWidth = s * .22; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(far[0], far[1]); ctx.lineTo(x, y); ctx.stroke(); ctx.lineCap = "butt";
      // the bodies (Close View draws its own 3D afterimages over this floor streak)
      if (!floor) for (let k = n - 1; k >= 0; k--) { const [gx, gy] = toScreen({ x: G[k * 3] + .5, y: G[k * 3 + 1] + .45 }); ctx.globalAlpha = G[k * 3 + 2]; ctx.fillStyle = L.body; ctx.beginPath(); ctx.ellipse(gx, gy, s * .24, s * .34, 0, 0, 7); ctx.fill(); ctx.fillStyle = L.head; ctx.beginPath(); ctx.arc(gx, gy - s * .38, s * .14, 0, 7); ctx.fill(); }
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
// The fists' status meter (Tim, 2026-11-14: "If you only get perfect timing, it'll say 'Perfect Timing!' and just keep saying
// Perfect Timing. But if you get perfect rhythm, it'll say 'Perfect Rhythm!' and keep saying Perfect Rhythm until you get perfect
// timing again, and then it'll go back down. So it's like a meter showing what level you're at."). Presentation only: each step
// records its level on the chain (`fistCombo.level`, runtime state, never saved): `rhythm` for a rhythm blow, `timing` for a
// press on the beat or a charge let go in its perfect window, 0 for anything else, which clears the meter. The HUD (main.ts)
// shows `text[level]` in the message line while the chain lasts (its `window`, or a charge held from it) and the fists are in hand.
export const FIST_CALLOUT = { timing: 1, rhythm: 2, text: ["", "Perfect Timing!", "Perfect Rhythm!"] };
// The level a step earns: rhythm (a charge started on the beat, let go perfectly), timing (one of the two), or none.
export const fistCalloutLevel = (perfect, onBeat) => perfect === true && onBeat === true ? FIST_CALLOUT.rhythm : perfect === true || onBeat === true ? FIST_CALLOUT.timing : 0;
// The meter's level now: while a charge is held, the level it was pressed from (`fistCharge.level`, kept as the chain loops to
// the cross); otherwise the last step's level while its chain is alive; else 0. No allocation.
export function fistStatusLevel(game, now) {
  if (!game || game.damageNumbers === false) return 0;
  const h = game.fistCharge, c = game.fistCombo, lv = h ? Number(h.level) || 0 : c && now <= c.until ? Number(c.level) || 0 : 0;
  return lv > 0 && game.fistsEquipped?.() ? lv : 0;
}
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
// The awakened Hammerfall's clap (HAMMER_CLAP), on the floor at the impact (x, y: screen). Two straight lines of the hammer's
// gold light along the aim, a soft glow under a white core, sliding apart parallel and slamming back; while they are apart the
// band between them (where the slap lands) glows faintly; at the slap a flash along the line where they meet. Each line is a
// polyline through its `samples` points, each out by the lesser of the pose's travel and that sample's wall clip; between two
// samples it runs at the lesser of theirs (the band hammerClapExtent strikes), stepping in or out at a sample, so a line bends
// where a wall stops part of it, never cuts a wall's corner, and is straight where nothing does. Nothing drawn before the
// hammer lands. `still` (reduced motion, safe mode) drops the hum and the flash's swell. No allocation.
function clapPoint(ctx, fx, x, y, s, a, o, first) { const px = x + (fx.ax * a - fx.ay * o) * s, py = y + (fx.ay * a + fx.ax * o) * s; if (first) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
function clapPath(ctx, fx, x, y, s, side, off, n, reverse = false, joined = false) { // one line (screen), near end to far (or back)
  const at = (k) => Math.min(off, hammerClapOut(fx, side, k)) * side;
  for (let k = 0; k < n; k++) {
    const i = reverse ? n - 1 - k : k, a = hammerClapSampleAt(fx, i), o = at(i); clapPoint(ctx, fx, x, y, s, a, o, k === 0 && !joined);
    if (k < n - 1) { const j = reverse ? i - 1 : i + 1, m = Math.abs(o) < Math.abs(at(j)) ? o : at(j); clapPoint(ctx, fx, x, y, s, a, m, false); clapPoint(ctx, fx, x, y, s, hammerClapSampleAt(fx, j), m, false); }
  }
}
function drawHammerClap(ctx, fx, x, y, s, still) {
  if (fx.delay > 0 || !fx.clap || !Number.isFinite(fx.ax) || !Number.isFinite(fx.ay)) return;
  const C = HAMMER_CLAP, K = C.colors, n = C.samples, q = hammerClapPose(hammerClapSpan() - fx.life); if (!q) return;
  const off = (Number.isFinite(fx.spread) ? fx.spread : C.spread) * q.apart, alpha = q.phase === "clap" ? q.flash : 1;
  const hum = still || q.phase !== "hold" ? 1 : .85 + .15 * Math.sin(fx.life * 90);
  if (off > 0) { // the band between the lines: out along one, back along the other
    ctx.globalAlpha = .14 * hum; ctx.fillStyle = K.band; ctx.beginPath(); clapPath(ctx, fx, x, y, s, 1, off, n);
    clapPath(ctx, fx, x, y, s, -1, off, n, true, true); ctx.closePath(); ctx.fill();
  }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (q.phase === "clap") { // the slap: a flash along the line where they met
    ctx.globalAlpha = .5 * q.flash; ctx.strokeStyle = K.flash; ctx.lineWidth = s * (.5 + (still ? .4 : .9 * (1 - q.flash)));
    ctx.beginPath(); clapPath(ctx, fx, x, y, s, 1, 0, n); ctx.stroke();
  }
  for (let side = -1; side <= 1; side += 2) {
    ctx.globalAlpha = .45 * alpha * hum; ctx.strokeStyle = K.glow; ctx.lineWidth = Math.max(3, s * .22); ctx.beginPath(); clapPath(ctx, fx, x, y, s, side, off, n); ctx.stroke();
    ctx.globalAlpha = .95 * alpha; ctx.strokeStyle = K.core; ctx.lineWidth = Math.max(1.5, s * .07); ctx.beginPath(); clapPath(ctx, fx, x, y, s, side, off, n); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
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
    if (!fx.brawler || fx.swingHit) continue; // great-sweep.ts: a swing's blow is drawn as the swing itself (below)
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
    } else if (fx.kind === "hammer-clap") drawHammerClap(ctx, fx, x, y, s, !!(game.presentation?.reduceMotion || game.presentation?.safeMode)); // the awakened Hammerfall's clap
    else if (fx.kind === "great-sweep") {
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
  { const q = sweepIndicator(game, SWEEP_DRAW); if (q) { const [x, y] = toScreen(q); drawSweepSwing(ctx, q, x, y, s); } } // the Great Sweep's 360° swing (great-sweep.ts)
  drawFistStep(ctx, game, toScreen, s, capture != null); // Close View passes its capture (the floor layer)
  drawCycloneHeel(ctx, game, toScreen, s, capture != null); // the awakened Ki Blast's spinning kick (CYCLONE_HEEL)
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
