// Ordinary creature behaviour (Tim, 2026-11-14: "enemies... how they swing, act and behave, with more attacks and motions,
// windups and intelligence... more substantial, not just stand there and take damage... they just kind of show up").
//
// A thin layer over the two creature brains (monster-pack.ts updatePackMonster and game.ts updateEnemyAI) for ordinary
// creatures only: never bosses, elites, world beasts, guardians, haunts, the Foundry's domains or the Gaunt's own moves. It
// adds, as data (BEHAVIOUR), per family:
//   awareness   unaware -> notice (a short alert beat, `e.alert`) -> engaged; a creature that notices calls its kin nearby,
//               who look up one after another (staggered); spawns that appear near the Wayfarer arrive (`e.arrive`), harmless
//   spacing     engaged creatures without an attack token hold a ring (their band) round the Wayfarer, strafing, kept apart
//   tokens      only so many may wind up or strike at once (melee, swarm and ranged pools); the longest waiter is served first
//   variety     a heavy blow (longer windup, harder, left open after) or a light one; light combos; feints for the smart ones
//   reactions   poise and flinches (`e.flinch`), a poise break interrupts a windup, then a stagger immunity window; guards
//               (`e.guard`) and sidesteps (`e.dodge`) for the smart families; a backstep after a blow for skirmishers
//   retreat     the cowardly back off when badly hurt (`e.regroup`), then come back with their kin
// The game opts in by handing both brains a squad board (createSquad); without one nothing here runs, so every older fixture
// and test world behaves exactly as before. Nothing here is saved: the runtime record `e.bhv` is not enumerable (a resumed
// creature re-derives it; saves stay schema 14 and unchanged apart from the art's small numeric flags), all choices are hashed from stable ids (no Math.random), and the work
// per frame is O(active creatures) plus a bounded kin check (BEHAVIOUR.spacing.scan).
import { hashSeed } from "./random.ts";

export const BEHAVIOUR_VERSION = 1;

// ---------------------------------------------------------------- the table
// Family fields:
//   pool        the token pool its close attacks draw from ("melee" or "swarm"; ranged attacks always draw "ranged")
//   band        [near, far] tiles: the ring it holds while it waits for a token (spacing)
//   spacing     true: it holds the ring and strafes while waiting (false: its own brain keeps placing it)
//   sep         tiles it keeps from its kin
//   rest        [lo, hi] seconds after an attack before it asks for a token again (hashed between)
//   heavy       { chance, windup, damage, recover }: some blows are heavy (windup x, damage x, recovery x: a punish window)
//   combo       { chance, hits: [lo, hi], damage }: a light chain of close blows (follow-ups at `damage`)
//   feint       chance a close windup is a feint: it breaks off at `feintAt` of the windup and sidesteps
//   guard       { chance, time, reduce, cooldown }: braces against a swing in reach; blows from the front lose `reduce`
//   dodge       { chance, time, dist, cooldown }: sidesteps a swing in reach (untargetable for the step)
//   poise       share of its maximum health in blows, inside the regeneration window, that breaks its poise
//   flinchAt    a blow of at least this share of its maximum health makes it flinch (0: every blow)
//   flinchTime  seconds of the flinch (`e.flinch` 1 -> 0: the art's jolt; it is never knocked across the floor, Tim 2026-11-13)
//   stagger, immune     seconds staggered by a poise break, then seconds in which blows neither flinch nor break it
//   regen       [delay, perSecond]: poise comes back `perSecond` (share of the bar) once `delay` seconds pass without a blow
//   retreat     { hp, time, far, brave } or null: below `hp` of its health it backs off once for `time` s (or to `far` tiles);
//               `brave` engaged kin within 4 tiles end it early
//   backstep    tiles it steps back after a blow (skirmishers)
//   press       seconds a token lets it close in before it must strike or give the token back
//   tokensOnly  only the token rule applies (its own brain keeps everything else)
export const BEHAVIOUR = {
  version: BEHAVIOUR_VERSION,
  awareness: { alert: [.4, .7], hitAlert: .25, call: 6.5, callDelay: [.12, .4], callPerTile: .04, pulseLife: 1.6, pulses: 8 },
  arrival: { radius: 7, time: .9 },
  tokens: { melee: { base: 2, per: 6, max: 3 }, swarm: { base: 4, per: 3, max: 8 }, ranged: { base: 1, per: 3, max: 2 }, fair: .05 },
  spacing: { scan: 2.6, push: 2.2, flip: [2.6, 4.4], strafe: .55, close: .9, hold: 1, held: .05, reach: .85 }, /* held: a creature slowed below this share of its pace (held fast) neither strafes nor steps; reach: a legacy creature on its ring winds up only within this share of its next blow's real reach (review 975) */
  react: { swingReach: 2.6, reroll: .6, sidestep: .3, backstep: .32, comboWindup: .62 },
  families: {
    brood: { pool: "swarm", band: [1.3, 2.1], spacing: false, sep: .75, rest: [.35, .75], heavy: null, combo: { chance: 25, hits: [2, 2], damage: .5 }, feint: 0, feintAt: .5, guard: null, dodge: null,
      poise: .22, flinchAt: 0, flinchTime: .22, stagger: .45, immune: 1.6, regen: [1.2, .5], retreat: null, backstep: 0, press: 2.2 },
    beast: { pool: "melee", band: [2.4, 3.3], spacing: true, sep: .95, rest: [.5, 1.1], heavy: { chance: 30, windup: 1.45, damage: 1.3, recover: 1.35 }, combo: { chance: 35, hits: [2, 3], damage: .75 }, feint: 10, feintAt: .55, guard: null, dodge: null,
      poise: .3, flinchAt: 0, flinchTime: .24, stagger: .5, immune: 2, regen: [1.4, .45], retreat: { hp: .2, time: 1.8, far: 6, brave: 2 }, backstep: 1.1, press: 2.4 },
    humanoid: { pool: "melee", band: [2.5, 3.4], spacing: true, sep: 1, rest: [.6, 1.2], heavy: { chance: 35, windup: 1.45, damage: 1.3, recover: 1.4 }, combo: { chance: 40, hits: [2, 3], damage: .75 }, feint: 30, feintAt: .55,
      guard: { chance: 35, time: .8, reduce: .5, cooldown: 4 }, dodge: { chance: 20, time: .28, dist: 1.3, cooldown: 4.5 },
      poise: .4, flinchAt: .14, flinchTime: .26, stagger: .55, immune: 2.2, regen: [1.6, .4], retreat: null, backstep: .6, press: 2.6 },
    brute: { pool: "melee", band: [2.3, 3.2], spacing: true, sep: 1.2, rest: [.8, 1.5], heavy: { chance: 45, windup: 1.5, damage: 1.35, recover: 1.5 }, combo: { chance: 25, hits: [2, 2], damage: .8 }, feint: 0, feintAt: .55, guard: null, dodge: null,
      poise: .55, flinchAt: .18, flinchTime: .3, stagger: .7, immune: 2.6, regen: [2, .35], retreat: null, backstep: 0, press: 3 },
    caster: { pool: "melee", band: [3.5, 5.5], spacing: false, sep: 1, rest: [.6, 1.3], heavy: null, combo: null, feint: 0, feintAt: .55, guard: null, dodge: null,
      poise: .25, flinchAt: 0, flinchTime: .24, stagger: .45, immune: 1.8, regen: [1.4, .45], retreat: { hp: .3, time: 2, far: 7, brave: 2 }, backstep: 1, press: 2.2 },
    adventure: { pool: "melee", band: [2.5, 3.5], spacing: false, sep: .9, rest: [.6, 1.2], heavy: { chance: 25, windup: 1.4, damage: 1.25, recover: 1.35 }, combo: null, feint: 0, feintAt: .55, guard: null, dodge: null,
      poise: .35, flinchAt: .1, flinchTime: .24, stagger: .5, immune: 2, regen: [1.5, .4], retreat: null, backstep: 0, press: 2.6 },
    duelist: { pool: "melee", tokensOnly: true, band: [1.6, 2.6], spacing: false, sep: 1, rest: [.3, .6], press: 3 },
  },
  // kind -> family, or [family, overrides]. Left out on purpose: the Grave Lantern (its natural leap is the Proving Ground's pinned
  // exact-resume witness, proving-ground-natural-lantern-recovery), every unique beast and their minions, and the far reaches' Gloomgorge. Legacy creatures (combat.ts) also name their close `moves` (MELEE_PATTERNS ids).
  kinds: {
    pallidCrawler: "brood", slateRook: "brood", gloomwisp: "brood",
    ashling: ["brood", { moves: ["lunge", "longReach"] }], glassMite: ["brood", { moves: ["hop", "longReach"] }],
    riftLynx: ["beast", { feint: 30, dodge: { chance: 35, time: .26, dist: 1.4, cooldown: 3.5 } }], crystalCrab: "beast", veilSpinner: ["beast", { spacing: false }], crystalStrider: "beast",
    inkMaw: "beast", roofGargoyle: "beast", inkWing: "beast", inkGriffin: "beast",
    ashenHound: ["beast", { moves: ["zigzag", "lunge"], feint: 20 }], coilStalker: ["beast", { moves: ["longReach", "lunge"] }],
    mirrorShade: "humanoid", hollowMiner: "humanoid", weepingSaint: ["humanoid", { spacing: false, guard: null, dodge: null, feint: 0, backstep: 0 }],
    hollowMarshal: ["humanoid", { moves: ["longReach", "lunge", "slam"] }],
    thunderhorn: "brute", amalgam: "brute", earthGolem: "brute", sunderjaw: ["brute", { spacing: false }], strataEel: ["brute", { spacing: false }], gnawingMaw: ["brute", { spacing: false }],
    hullWarden: "brute", ridgeDemon: "brute", stormling: "brute", coilWarden: "brute", sparkHauler: "brute", inkStrider: "brute", inkPool: "brute", groveStag: "brute",
    mossBlob: "brute", emberBlob: "brute", frostBlob: "brute", duskBlob: "brute", saltBlob: "brute",
    rootBrute: ["brute", { moves: ["slam", "longReach"] }], riftColossus: ["brute", { moves: ["slam", "longReach"] }],
    lumenWraith: "caster", cinderSeraph: "caster", hangedChoir: "caster", siegeBeetle: "caster", veinWraith: "caster", deckSentry: "caster", riveter: "caster",
    shardling: "caster", prismWarden: "caster", groveMoth: "caster",
    sparkWarden: "caster", veilMoth: ["caster", { backstep: 0 }], cinderWisp: "caster", voidSentinel: "caster",
    galleryLurker: "adventure", censerWarden: "adventure", vinehookLeaper: "adventure", thornspitterBloom: "adventure", sinkmaw: "adventure", cinderKite: "adventure",
    lamplighter: "adventure", knellkeeper: "adventure", spindriftMedusa: "adventure", prismStilt: "adventure", rimeSentinel: "adventure", lakeGlider: "adventure",
    hookhanger: "adventure", slagwright: "adventure",
    gauntDuelist: "duelist", gauntCutthroat: "duelist", gauntLongarm: "duelist",
  },
};
// Movement modes that drop in rather than climb out of the ground, and those that fade in.
const DROPS = new Set(["fly", "hover"]), FADES = new Set(["phase", "blink"]), LEGACY_FLYERS = new Set(["veilMoth", "cinderWisp", "sparkWarden"]);
const GUARDIAN_ROLES = new Set(["gateWarden", "objectiveGuardian", "wingMiniboss", "finalBoss", "skyland", "seedRealmHeart"]);

// ---------------------------------------------------------------- profiles
const PROFILES = new Map(); // kind -> merged profile (bounded by the table's kinds)
function profileOfKind(kind) {
  let P = PROFILES.get(kind); if (P !== undefined) return P;
  const entry = BEHAVIOUR.kinds[kind];
  if (!entry) { PROFILES.set(kind, null); return null; }
  const [family, over] = Array.isArray(entry) ? entry : [entry, null], F = BEHAVIOUR.families[family];
  P = F ? Object.freeze({ family, ...F, ...(over || {}) }) : null;
  PROFILES.set(kind, P); return P;
}
// The creature's behaviour profile, or null when it is not an ordinary creature (bosses, elites, beasts, guardians, summoned
// illusions, ambient and passive life, skirmishers, sea creatures, the Stalker, the Foundry's domains and anything unlisted).
export function behaviourProfile(e) {
  if (!e || e.dead || e.kind === "npc") return null;
  if (e.boss || e.eliteId || e.elite || e.worldBeast || e.questingBeast || e.gatePredator || e.marginWarden || e.fracWarden || e.packGuardian || e.stegoRoom || e.spinoRoom || e.spinoInterloper || e.farArrayBoss || e.pentBoss || e.pentFinaleBeast || e.buildingGuardian) return null;
  if (e.illusion || e.astralCompanionOf || e.astralAllyOf || e.passiveBehavior || e.ambient || e.skirmishId || e.seaKind || e.stalker || e.stalkerKin || e.stalkerDecoy || e.mirrorClone || e.morphWorm || e.blobletOf || e.wormOf || e.gloomOrbOf || e.roofDweller || e.domainFamily || e.foundryAttack || e.passingBeast || e.retreating || e.fleeTo || e.objectiveId) return null;
  if (e.dungeonRole && GUARDIAN_ROLES.has(e.dungeonRole)) return null;
  return profileOfKind(e.kind);
}

// ---------------------------------------------------------------- the squad board (one per game; reused every frame)
const POOLS = ["melee", "swarm", "ranged"];
export function createSquad() {
  const per = () => ({ melee: 0, swarm: 0, ranged: 0 });
  return { frame: 0, now: 0, dt: 0, px: 0, py: 0, swinging: false, enemies: null, engaged: per(), busy: per(), cap: per(), topWait: per(), nextTop: per(),
    pulses: Array.from({ length: BEHAVIOUR.awareness.pulses }, () => ({ x: 0, y: 0, at: -1e12, r: 0 })), pulseNext: 0,
    stats: { granted: 0, denied: 0, maxBusy: per() }, w: null, disp: null };
}
// The pool an attacking creature holds (its grant, or after a load its family's close pool).
function heldPool(e, b, B) { return b?.pool || (e.pack?.attack && e.pack.rangedPool ? "ranged" : B.pool); }
// Is it using a token now: closing in on one, winding up or striking (never in recovery), or between combo blows.
export function holdsToken(e) {
  const b = e.bhv; if (!b) return false;
  if (b.press > 0 || b.comboLeft > 0) return true;
  if (e.pack) return !!e.pack.attack && e.pack.phase !== "recover";
  return e.telegraph > 0;
}
// Once a frame, before the creatures move: count the engaged and the attacking per pool (re-derived every frame from the
// creatures themselves, so a load, a death or an unloaded section never leaks a token) and set this frame's caps.
export function squadFrame(board, enemies, player, now, dt, swinging = false, all = null) {
  board.frame++; board.enemies = all || enemies; board.now = Number(now) || 0; board.dt = Number(dt) || 0; board.px = Number(player?.x) || 0; board.py = Number(player?.y) || 0; board.swinging = !!swinging;
  for (const k of POOLS) { board.topWait[k] = board.nextTop[k]; board.nextTop[k] = 0; board.engaged[k] = 0; board.busy[k] = 0; }
  for (const e of enemies) {
    const B = behaviourProfile(e), b = e.bhv; if (!B || !b || !e.aggro || b.arrive > 0) continue;
    board.engaged[B.pool]++; if (B.family === "caster") board.engaged.ranged++;
    if (holdsToken(e)) board.busy[heldPool(e, b, B)]++;
  }
  const T = BEHAVIOUR.tokens;
  for (const k of POOLS) { const t = T[k]; board.cap[k] = Math.min(t.max, t.base + Math.floor(board.engaged[k] / t.per)); }
}
// Ask for a token from `pool`. Granted when the pool has room and nobody has waited longer (the fairness rule); otherwise its
// wait grows, so it is served first next time.
export function squadRequest(board, e, b, pool) {
  const T = BEHAVIOUR.tokens, room = board.cap[pool] - board.busy[pool];
  if (room <= 0 || (room < 2 && b.wait + T.fair < board.topWait[pool])) { b.wait += board.dt; if (b.wait > board.nextTop[pool]) board.nextTop[pool] = b.wait; board.stats.denied++; return false; }
  board.busy[pool]++; if (board.busy[pool] > board.stats.maxBusy[pool]) board.stats.maxBusy[pool] = board.busy[pool];
  b.wait = 0; b.pool = pool; board.stats.granted++; return true;
}

// ---------------------------------------------------------------- per creature record (runtime; `e.bhv`)
const FLAGS = ["alert", "arrive", "flinch", "guard", "dodge", "feint"];
function freshBhv(e) { return { v: BEHAVIOUR_VERSION, hp: Number(e.hp) || 0, poise: 1, engaged: !!e.aggro || e.telegraph > 0 || !!e.pack?.attack, n: 0, wait: 0, rest: 0, press: 0, pool: null, alert: 0, alertMax: 0, call: -1, arrive: 0,
  flinch: 0, stagger: 0, immune: 0, calm: 0, guard: 0, guardCd: 0, dodge: 0, dodgeCd: 0, reroll: 0, side: 0, sx: 0, sy: 0, back: 0, retreat: 0, fled: false, comboLeft: 0, combo: 0, comboOf: 0, feintAt: 0, wind: 0, orbit: 0, flip: 0, flipped: false }; }
const roll = (e, b, tag) => hashSeed(`${e.id}:${tag}:${++b.n}`) % 100;
const span = (e, b, tag, [lo, hi]) => lo + (hashSeed(`${e.id}:${tag}:${++b.n}`) % 1000) / 1000 * (hi - lo);
// A creature made in play near the Wayfarer (a Fractured wave or a warden's call, a respawn, a brood birth: the game marks it
// with markArrival) arrives on its first behaviour frame: it climbs out, drops in or fades in, harmless, for
// BEHAVIOUR.arrival.time. Creatures already standing in a section or a dungeon when it loads do not (they were there all along).
export function markArrival(e) { if (e) e.arriving = true; return e; }
// The record, made on its first behaviour frame.
export function behaviourState(e, board) {
  let b = e.bhv;
  if (b && b.v === BEHAVIOUR_VERSION) return b;
  b = freshBhv(e);
  // Runtime only: not enumerable, so a save, a snapshot or a clone never carries it (a resumed creature starts a fresh record, engaged
  // if it was engaged, with no token, combo, feint, guard or dodge; any flag the art reads is cleared with it).
  Object.defineProperty(e, "bhv", { value: b, writable: true, enumerable: false, configurable: true });
  if (e.dodge > 0) e.untargetable = false;
  for (const k of FLAGS) if (e[k]) e[k] = 0;
  const A = BEHAVIOUR.arrival, d = Math.hypot((Number(e.x) || 0) - board.px, (Number(e.y) || 0) - board.py);
  if (e.arriving && !(e.hp < e.maxHp) && d <= A.radius && e.brain !== "ambush") { b.arrive = A.time; e.arrive = 1; e.arriveStyle = DROPS.has(e.movement) || LEGACY_FLYERS.has(e.kind) ? "drop" : FADES.has(e.movement) ? "fade" : "emerge"; }
  if (e.arriving) e.arriving = false;
  return b;
}
// After a load: the attack itself never resumes (resetPackRuntime), so neither do the token, a combo, a feint, a dodge or a guard.
export function resetBehaviour(e) {
  const b = e?.bhv; if (!b) return e;
  b.press = 0; b.comboLeft = 0; b.combo = 0; b.feintAt = 0; b.guard = 0; b.dodge = 0; b.side = 0; b.back = 0; b.stagger = 0; b.pool = null; b.wait = 0; b.hp = Number(e.hp) || 0;
  if (e.guard) e.guard = 0; if (e.dodge) e.dodge = 0; if (e.feint) e.feint = 0; if (e.flinch) e.flinch = 0;
  return e;
}

// ---------------------------------------------------------------- awareness
function pulse(board, e, B) {
  const P = board.pulses[board.pulseNext]; board.pulseNext = (board.pulseNext + 1) % board.pulses.length;
  P.x = Number(e.x) || 0; P.y = Number(e.y) || 0; P.at = board.now; P.r = BEHAVIOUR.awareness.call;
}
// It notices the Wayfarer: the alert beat, and its kin nearby are called.
export function notice(e, b, B, board, hit = false) {
  const A = BEHAVIOUR.awareness;
  b.alertMax = b.alert = hit ? A.hitAlert : span(e, b, "alert", A.alert); e.alert = 1; b.call = -1; e.aggro = true; b.engaged = true;
  pulse(board, e, B);
}
// An unaware creature hears a call: after a staggered delay (hashed, and longer the farther it stands) it looks up.
function hearCall(e, b, B, board) {
  if (b.call >= 0) { b.call -= board.dt; if (b.call < 0) { notice(e, b, B, board); return true; } return false; }
  const A = BEHAVIOUR.awareness, x = Number(e.x) || 0, y = Number(e.y) || 0;
  for (const P of board.pulses) {
    if (board.now - P.at > A.pulseLife * 1000) continue;
    const d = Math.hypot(P.x - x, P.y - y); if (d > P.r) continue;
    b.call = span(e, b, "call", A.callDelay) + d * A.callPerTile; return false;
  }
  return false;
}

// ---------------------------------------------------------------- hit reactions
// Every blow is read from the health it took since last frame, so every damage path (blades, shots, spells, Echoes, glyphs) counts.
function readBlows(e, b, B, board) {
  const hp = Number(e.hp) || 0, drop = b.hp - hp; b.hp = hp;
  if (!(drop > 0) || e.dead || hp <= 0) return 0;
  const max = Math.max(1, Number(e.maxHp) || 1);
  if (b.guard > 0) { /* braced: a blow from the front (the Wayfarer within 100 degrees of its guard) loses `reduce` */
    const dx = board.px - e.x, dy = board.py - e.y, m = Math.hypot(dx, dy) || 1;
    if ((dx * b.sx + dy * b.sy) / m >= -.17) { const back = Math.min(max - hp, drop * B.guard.reduce); e.hp = hp + back; b.hp = e.hp; return drop - back; }
  }
  return drop;
}
function react(e, b, B, board, dealt, dropAttack) {
  const max = Math.max(1, Number(e.maxHp) || 1), share = dealt / max;
  b.calm = 0;
  if (b.immune > 0) return;
  b.poise -= share / B.poise;
  if (b.poise <= 0) { /* poise broken: out of its windup, staggered, then a window in which blows neither flinch nor break it */
    dropAttack(e, b); b.stagger = B.stagger; b.flinch = Math.max(B.flinchTime, B.stagger); e.flinch = 1; b.immune = B.stagger + B.immune; b.poise = 1;
    b.press = 0; b.comboLeft = 0; b.feintAt = 0; b.guard = 0; e.guard = 0;
    return;
  }
  if (share >= B.flinchAt && !(b.flinch > 0)) { b.flinch = B.flinchTime; e.flinch = 1; }
}
function poiseTick(e, b, B, dt) {
  b.calm += dt; if (b.immune > 0) b.immune = Math.max(0, b.immune - dt);
  if (b.calm >= B.regen[0] && b.poise < 1) b.poise = Math.min(1, b.poise + B.regen[1] * dt);
}

// ---------------------------------------------------------------- movement helpers
const V = { x: 0, y: 0, speed: 0 };
// Its own steps (a sidestep, a backstep, a retreat) go at its own pace: a slowed or held creature (speedMultiplier) steps less.
function moveBy(board, e, dx, dy) { const k = Number.isFinite(e.speedMultiplier) ? e.speedMultiplier : 1; if (!(k >= BEHAVIOUR.spacing.held)) return false; dx *= Math.min(1.5, k); dy *= Math.min(1.5, k); return board.disp ? board.disp(e, dx, dy) : board.w.move(e, dx, dy, NOPHASE); }
const NOPHASE = { phase: false };
// The ring it holds while it waits: strafing round the Wayfarer at its band, flipping direction now and then, kept from its kin.
export function ringVector(e, b, B, board, enemies = board.enemies) {
  const S = BEHAVIOUR.spacing, px = board.px, py = board.py, dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1, tx = dx / d, ty = dy / d;
  if (!b.orbit) b.orbit = hashSeed(`${e.id}:ring`) % 2 ? 1 : -1;
  b.flip -= board.dt; if (b.flip <= 0) { if (b.flipped) b.orbit = -b.orbit; b.flipped = true; b.flip = span(e, b, "flip", S.flip); }
  const [near, far] = B.band, mid = (near + far) / 2, radial = Math.max(-1.2, Math.min(1.2, (d - mid) * .9));
  if (d <= (Number(e.bodyRadius) || .38) + S.hold || (Number.isFinite(e.speedMultiplier) && e.speedMultiplier < S.held)) { V.x = 0; V.y = 0; V.speed = 0; return V; } // already at the Wayfarer's side: it stands its ground and waits (it never backs off to let them through)
  let x = -ty * b.orbit * S.strafe + tx * radial, y = tx * b.orbit * S.strafe + ty * radial;
  const push = separation(e, B, enemies); x += push.x * S.push; y += push.y * S.push;
  V.x = x; V.y = y; V.speed = d > far + .4 || d < near - .4 ? S.close : S.strafe; return V;
}
// With a token it closes straight in (still kept off its kin), whatever its brain would rather do.
export function pressVector(e, b, B, board, enemies = board.enemies) {
  const dx = board.px - e.x, dy = board.py - e.y, d = Math.hypot(dx, dy) || 1, push = separation(e, B, enemies);
  V.x = dx / d + push.x * .6; V.y = dy / d + push.y * .6; V.speed = Number.isFinite(e.speedMultiplier) && e.speedMultiplier < BEHAVIOUR.spacing.held ? 0 : BEHAVIOUR.spacing.close; return V;
}
const PUSH = { x: 0, y: 0 };
export function separation(e, B, enemies) {
  PUSH.x = 0; PUSH.y = 0; const R = B.sep, scan = BEHAVIOUR.spacing.scan;
  for (const q of enemies || []) {
    if (q === e || q.dead || q.ambient || q.passiveBehavior || q.kind === "npc") continue;
    const dx = e.x - q.x, dy = e.y - q.y; if (dx > scan || dx < -scan || dy > scan || dy < -scan) continue;
    const d = Math.hypot(dx, dy); if (d >= R) continue;
    const k = (R - d) / R, m = d || 1; PUSH.x += (d ? dx / m : (hashSeed(e.id) % 2 ? 1 : -1)) * k; PUSH.y += (d ? dy / m : 0) * k;
  }
  return PUSH;
}

// ---------------------------------------------------------------- the per-frame steps
// The gate, after its brain has looked for the Wayfarer: arrival, blows, calls, noticing and the alert beat. True when the frame
// is spent (arriving, or in the alert beat). An unaware creature returns false and its brain wanders as before.
export function behaviourGate(e, b, B, board, dropAttack) {
  const dt = board.dt;
  if (b.arrive > 0) { b.arrive = Math.max(0, b.arrive - dt); e.arrive = b.arrive / BEHAVIOUR.arrival.time; b.hp = Number(e.hp) || 0; if (b.arrive > 0) return true; e.arrive = 0; if (!e.aggro) { e.aggro = true; pulse(board, e, B); } b.engaged = true; return false; }
  const dealt = readBlows(e, b, B, board);
  if (B.tokensOnly) return false;
  if (dealt > 0) react(e, b, B, board, dealt, dropAttack);
  poiseTick(e, b, B, dt);
  if (!e.aggro) { b.engaged = false; hearCall(e, b, B, board); }
  else if (!b.engaged) { if (e.telegraph > 0 || e.pack?.attack) b.engaged = true; else notice(e, b, B, board, dealt > 0); } // already mid-attack: it noticed long ago
  if (b.alert > 0) { b.alert = Math.max(0, b.alert - dt); e.alert = b.alert / (b.alertMax || 1); faceWayfarer(e, board); if (b.alert > 0) return true; e.alert = 0; }
  return false;
}
function faceWayfarer(e, board) { const dx = board.px - e.x; if (e.pack || e.packKind) e.facingX = dx >= 0 ? 1 : -1; else if (e.ai) e.ai.facing = Math.abs(dx) >= Math.abs(board.py - e.y) ? (dx < 0 ? "left" : "right") : (board.py < e.y ? "up" : "down"); }

// The reactions, while engaged and free to act: a stagger, the flinch's jolt, a sidestep (a feint's or a dodge's), a backstep,
// a guard, the retreat. True when the frame is spent. `busy` is whether it is winding up or striking now.
export function behaviourReact(e, b, B, board, d, busy, recovering, dropAttack) {
  const dt = board.dt, R = BEHAVIOUR.react, enemies = board.enemies;
  if (b.press > 0) { b.press = Math.max(0, b.press - dt); if (b.press <= 0) b.rest = Math.max(b.rest, .4); } // a token unused gives itself back
  if (B.tokensOnly) return false;
  b.guardCd = Math.max(0, b.guardCd - dt); b.dodgeCd = Math.max(0, b.dodgeCd - dt); b.reroll = Math.max(0, b.reroll - dt); b.rest = Math.max(0, b.rest - dt);
  if (b.flinch > 0) { /* the jolt back, a little at a time */
    b.flinch = Math.max(0, b.flinch - dt); e.flinch = b.flinch / Math.max(B.flinchTime, b.stagger > 0 ? B.stagger : 0, .01);
  } else if (e.flinch) e.flinch = 0;
  if (b.stagger > 0) { b.stagger = Math.max(0, b.stagger - dt); return true; }
  // Retreat: once, when badly hurt; ends at `far`, after `time`, or when `brave` engaged kin stand within 4 tiles.
  if (B.retreat && !b.fled && e.hp < (Number(e.maxHp) || 0) * B.retreat.hp) { b.fled = true; b.retreat = B.retreat.time; dropAttack(e, b); b.press = 0; b.comboLeft = 0; e.regroup = true; }
  if (b.retreat > 0) {
    b.retreat = Math.max(0, b.retreat - dt);
    const dx = e.x - board.px, dy = e.y - board.py, m = Math.hypot(dx, dy) || 1;
    if (m >= B.retreat.far || b.retreat <= 0 || (B.retreat.time - b.retreat > .8 && kinNear(e, enemies, 4) >= B.retreat.brave)) { b.retreat = 0; e.regroup = false; b.rest = 0; return false; }
    moveBy(board, e, dx / m * 1.05 * dt, dy / m * 1.05 * dt); faceWayfarer(e, board); return true;
  }
  if (busy) { b.back = 0; b.side = 0; if (b.dodge > 0) { b.dodge = 0; e.dodge = 0; e.untargetable = false; } return false; } // winding up or striking: its own steps wait (a scripted or resumed windup lands)
  if (b.dodge > 0) { /* the sidestep of a dodge: untargetable while it lasts */
    const k = Math.min(dt, b.dodge); b.dodge = Math.max(0, b.dodge - dt); e.dodge = b.dodge / B.dodge.time;
    moveBy(board, e, b.sx * B.dodge.dist * k / B.dodge.time, b.sy * B.dodge.dist * k / B.dodge.time);
    if (b.dodge <= 0) { e.untargetable = false; e.dodge = 0; }
    return true;
  }
  if (b.side > 0) { /* a feint's sidestep */
    const k = Math.min(dt, b.side); b.side = Math.max(0, b.side - dt); e.feint = b.side / R.sidestep;
    moveBy(board, e, b.sx * 1.1 * k / R.sidestep, b.sy * 1.1 * k / R.sidestep); return true;
  } else if (e.feint) e.feint = 0;
  if (b.back > 0) { /* the backstep after a blow */
    const k = Math.min(dt, b.back); b.back = Math.max(0, b.back - dt); const dx = e.x - board.px, dy = e.y - board.py, m = Math.hypot(dx, dy) || 1;
    moveBy(board, e, dx / m * B.backstep * k / R.backstep, dy / m * B.backstep * k / R.backstep); return true;
  }
  if (b.guard > 0) { b.guard = Math.max(0, b.guard - dt); e.guard = b.guard / B.guard.time; faceWayfarer(e, board); return true; } else if (e.guard) e.guard = 0;
  // A swing in reach: the smart ones may sidestep it or brace for it (one roll per R.reroll s; never mid-windup).
  if (board.swinging && !busy && b.reroll <= 0 && d <= R.swingReach && (B.dodge || B.guard)) {
    b.reroll = R.reroll;
    if (B.dodge && b.dodgeCd <= 0 && roll(e, b, "dodge") < B.dodge.chance) {
      const dx = board.px - e.x, dy = board.py - e.y, m = Math.hypot(dx, dy) || 1, side = roll(e, b, "dodge-side") < 50 ? 1 : -1;
      b.sx = -dy / m * side - dx / m * .35; b.sy = dx / m * side - dy / m * .35; const n = Math.hypot(b.sx, b.sy) || 1; b.sx /= n; b.sy /= n;
      b.dodge = B.dodge.time; b.dodgeCd = B.dodge.cooldown; e.dodge = 1; e.untargetable = true; if (recovering) dropAttack(e, b); return true;
    }
    if (B.guard && b.guardCd <= 0 && roll(e, b, "guard") < B.guard.chance) {
      const dx = board.px - e.x, dy = board.py - e.y, m = Math.hypot(dx, dy) || 1; b.sx = dx / m; b.sy = dy / m;
      b.guard = B.guard.time; b.guardCd = B.guard.cooldown; e.guard = 1; if (recovering) dropAttack(e, b); return true;
    }
  }
  return false;
}
function kinNear(e, enemies, r) { let n = 0; for (const q of enemies || []) { if (q === e || q.dead || !q.aggro || !q.bhv || q.bhv.retreat > 0) continue; if (Math.abs(q.x - e.x) <= r && Math.abs(q.y - e.y) <= r && Math.hypot(q.x - e.x, q.y - e.y) <= r) n++; } return n; }

// A blow is chosen: heavy or light, the start of a combo, or a feint. Returns the windup multiplier (never below 1) and sets
// `e.strikeScale` (its damage share), `e.heavy` and the combo count on the record.
export function shapeBlow(e, b, B, close, followUp = false) {
  e.heavy = false; e.strikeScale = 1; b.feintAt = 0;
  if (followUp) { e.strikeScale = B.combo?.damage || 1; return 1; }
  b.comboLeft = 0; b.combo = 0; b.comboOf = 0;
  if (!close || B.tokensOnly) return 1;
  if (B.heavy && roll(e, b, "heavy") < B.heavy.chance) { e.heavy = true; e.strikeScale = B.heavy.damage; return B.heavy.windup; }
  if (B.feint && roll(e, b, "feint") < B.feint) { b.feintAt = B.feintAt; return 1; } // the share of the windup left when it breaks off
  if (B.combo && roll(e, b, "combo") < B.combo.chance) { const [lo, hi] = B.combo.hits; b.comboOf = lo + (roll(e, b, "combo-n") % (hi - lo + 1)); b.combo = 1; b.comboLeft = b.comboOf - 1; }
  return 1;
}
// A feint breaks off: a sidestep to one side, and it may strike again soon.
export function startFeint(e, b, B, board) {
  const dx = board.px - e.x, dy = board.py - e.y, m = Math.hypot(dx, dy) || 1, side = roll(e, b, "feint-side") < 50 ? 1 : -1;
  b.sx = -dy / m * side; b.sy = dx / m * side; b.side = BEHAVIOUR.react.sidestep; e.feint = 1; b.feintAt = 0; b.press = 0; b.rest = .25;
}
// After its last blow: rest before the next token, step back if it is a skirmisher; a heavy blow leaves it open (`recover` x).
export function afterBlow(e, b, B) {
  b.comboLeft = 0; b.combo = 0; b.press = 0; b.pool = null; b.feintAt = 0;
  b.rest = span(e, b, "rest", B.rest);
  if (B.backstep > 0 && !e.heavy) b.back = BEHAVIOUR.react.backstep;
}
