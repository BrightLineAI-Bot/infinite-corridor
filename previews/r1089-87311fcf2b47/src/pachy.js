// The Pachycephalosaurus (Tim, 2026-11-27): a hostile dinosaur at the Spinosaurus's and the Wild Stegosaurus's level. A dome-headed
// biped, green over a gray belly, its head and dome yellow ringed with gray knobs, a black stripe from the crown down the back to the
// tail. Wild and hungry (an omnivore: it eats meat, so it chases the Wayfarer down), it fights other creatures, and it lies in wait
// disguised as an odd-looking rock. Three forms: flesh; ARMOR (a mechanized, plated version of itself, tougher while it lasts); and
// FOSSIL (after enough damage its flesh falls away and it fights on as bone, launching fossil skulls across the room).
//
// This module holds its numbers (PACHY), its moves (PACHY_ATTACKS, spread into monster-pack.ts ATTACK_MODULES), its START / RUN
// entries, its forms, the ambush, its duels' choreography, its big-room spawns (PACHY_ROOMS) and its overworld ambush spawns
// (PACHY_AMBUSH), both version-pinned. monster-pack.ts hands it the shared helpers once (installPachyKit) and calls pachyFrame (every
// frame: its pools, its forms, the disguise), pachyTick (every fighting frame, before the shared brain) and pachyCan (readiness).
//
// Bounded for the phone (PACHY.caps): at most 8 lobbed rocks, 4 skulls, 10 bone spikes and 4 shock rings live at once, each in a pool
// on the beast allocated once (e.pachyFx); nothing is allocated per frame. Every choice is hashed from stable ids (no Math.random).
//
// The pose contract the art reads (never timing):
//   e.pachyPose: null | "slamRaise" | "slam" | "chargeReady" | "charge" | "bonk" | "domeLoad" | "domeFlick" | "crouch" | "air" | "land" |
//     "kickL" | "kickR" | "butt" | "boneStamp" | "skullReady" | "skullThrow" | "burst" | "armorUp" | "shed" | "feed" | "clash" |
//     "drumRaise" | "drum" (Dome Drum: the dome up, then knocked on the ground, beat after beat);
//   e.pachyForm: "flesh" | "armor" | "fossil"; e.pachyShift (0..1: the armor plating closing, or the flesh falling away);
//   e.pachyDisguised (true while it lies as a rock); e.pachyAir (tiles off the ground); e.pachyHeading { x, y };
//   e.pachyFx (the pools: rocks { fx, fy, tx, ty, t, total }, skulls { x, y, vx, vy, spin }, bones { x, y, t, warn, up }, waves { x, y, r }).
import { hashSeed } from "./random.js?v=r1089-87311fcf2b47";
import { stegoRoomGround, stegoRoomSquare } from "./wild-stego.js?v=r1089-87311fcf2b47";

const TAU = Math.PI * 2;
export const PACHY_KIND = "pachy";
export const PACHY = {
  version: 1,
  turn: 2.6, /* radians a second its body turns toward what it fights, between moves */
  caps: { rocks: 8, skulls: 4, bones: 10, waves: 4 },
  // Its forms. ARMOR: at each health share in `at` (once each), it shifts (`shift` s, no blows) into its mechanized plating, which lasts
  // `time` s; while armored it takes only `taken` of every blow. FOSSIL: at `at` of its health its flesh falls away (`shed` s), for good;
  // the armor goes with it. Bone moves (fossilOnly) come only then; flesh moves (fleshOnly) never do.
  forms: {
    armor: { at: [.72, .48], time: 12, taken: .5, shift: 1.1 },
    fossil: { at: .3, shed: 1.6 },
  },
  fossilOnly: ["pachyBoneSpikes", "pachySkullLaunch"],
  fleshOnly: ["pachyRockLaunch"],
  // Dome Drum (Tim, 2026-11-27): it plants its feet and knocks its dome on the ground `knocks` times in a row (a count between the two,
  // hashed per beast and move), one knock every `every` s. Each knock strikes the marked circle `reach` past its body (in `radius`; the
  // mark follows the Wayfarer at `follow` while the head is up, and holds for the last `lockAt` s before each knock) and sends a small
  // burst ring out (`ring` tiles over `ringTime` s, `ringShare`, jumpable). `down`: the share of each beat the dome rests on the ground.
  // A knock or a ring that dazes the Wayfarer ends the drum (`endOnDaze`): no knock lands on her while she is down.
  drum: { knocks: [3, 4], every: .55, reach: 1.3, radius: 1.1, follow: 3, lockAt: .2, ring: 2.4, ringTime: .45, ringShare: .25, down: .35, endOnDaze: true },
  // The daze (Tim, 2026-11-27, after the Lightning Giant's stun counter): every landed blow of its head (`head`) or of any of its burst
  // rings counts; the `hits`-th within `decay` s of the last stuns the Wayfarer for `stun` s, stars circling over her head for `stars` s.
  // A knock or slam and its own ring count once between them. A parried blow, a stunned or fallen Wayfarer: nothing counts (game.ts dazeHit).
  daze: { hits: 2, stun: 1, decay: 8, stars: 2, head: ["pachyHeadSlam", "pachyCharge", "pachyDomeDrum"], rings: true },
  // Head slam: it rears and brings the dome down on the marked circle `reach` past its body (tracked until `lockAt`); a ring runs out
  // (`ring` tiles, `ringShare`, jumpable).
  slam: { reach: 1.5, radius: 1.35, lockAt: .25, follow: 5, ring: 2.8, ringShare: .3 },
  // Head charge: head down, it runs at `speed` tiles/s along the lane (locked `lockAt` s before it goes) for at most `run` tiles; the
  // dome hits once in `width`, knocking back `push` tiles. Into a wall it bonks (`bonk` s dazed, its recovery longer).
  charge: { speed: 10, run: 11, width: 1.05, lockAt: .3, push: 2.2, bonk: .9, turn: 2 },
  // Rock launch: it digs its dome under the ground and flicks `count` rocks into the air, staggered `stagger` s, each landing on its
  // mark after `flight` s (one on the Wayfarer, the rest `ring` tiles round them) in `radius`.
  rocks: { count: 4, stagger: .18, flight: .85, radius: .85, ring: [1.4, 3] },
  // Jump slam: it crouches (the landing circle follows the Wayfarer until `lockAt`), leaps at most `max` tiles over `time` s, `height`
  // tiles high, and lands feet first in `radius`; a ring runs out (`ring`, `ringShare`, jumpable).
  jump: { max: 9, time: .8, height: 2.6, radius: 1.7, lockAt: .2, follow: 4, ring: 3.4, ringShare: .35 },
  // Bicycle kick: it jumps and travels `dist` tiles along the lane over `time` s, its legs pedalling: `kicks` kicks, each striking in
  // `radius` round its feet once; low hops `height` tiles high.
  bicycle: { dist: 9, time: 2, kicks: 5, radius: 1.45, height: 1.1 },
  // Dome butts: `butts` short head-butts `every` s apart, stepping in `step` tiles each, each in an arc of `arc` degrees `reach` past it.
  butt: { butts: 3, every: .42, step: .55, reach: 1.7, arc: 110 },
  // Bone spikes (fossil): `count` spikes burst along the line toward the Wayfarer, `spacing` tiles apart, each after `warn` s (staggered
  // `stagger` s), in `radius`, standing `up` s.
  bones: { count: 5, spacing: 1.15, warn: .55, stagger: .12, radius: .7, up: .7 },
  // Skull launch (fossil): `count` fossil skulls flung `every` s apart, flying `speed` tiles/s and turning `turn` rad/s toward the
  // Wayfarer for `life` s; a skull hits once in `radius` and breaks on a wall.
  skulls: { count: 3, every: .45, speed: 8.5, turn: 1.1, life: 1.9, radius: .55 },
  // The ambush (PACHY_AMBUSH): it bursts out of its rock when the Wayfarer comes within `reveal` tiles (or strikes it, or a rival or a
  // bait rouses it): a burst in `radius` round it and a ring (`ring`, jumpable).
  ambush: { reveal: 3.4, radius: 2.3, ring: 3.6, ringShare: .3 },
  // Hungry: it turns on ordinary creatures within `range` (at `chance` % of its choices, every `refocus` s), each blow taking at least
  // `share` of the prey's health; one it kills it eats for `feed` s.
  hunt: { range: 9, chance: 45, refocus: 4, refocusYou: 2.5, share: .5, feed: 3 },
  // The dino duel (dino-duel.ts): a duel foe within `sight` draws it; with you within `close` it turns on you only at `youChance` %.
  // It closes to `gap` tiles past both bodies; a blow takes at least `share` of the foe's health (`floor` kept outside a duel).
  // Its choreography is its own against each foe (`moves`): head-on dome rams for the horned and the plated, kicks for the long neck.
  duel: { kinds: ["spinoRex", "wildStego", "earthApato", "triceratops"], sight: 16, refocus: 5, refocusYou: 2, close: 6, youChance: 22, share: .035, floor: .08, gap: .5, speed: 1, wait: true,
    moves: {
      spinoRex: ["pachyCharge", "pachyDomeRam", "pachyBicycle", "pachyJumpSlam", "pachySkullLaunch", "pachyBoneSpikes"],
      wildStego: ["pachyDomeRam", "pachyHeadSlam", "pachyBicycle", "pachyRockLaunch", "pachyBoneSpikes"],
      earthApato: ["pachyJumpSlam", "pachyBicycle", "pachyCharge", "pachyRockLaunch", "pachySkullLaunch"],
      triceratops: ["pachyClash", "pachyDomeRam", "pachyCharge", "pachyHeadSlam", "pachyBoneSpikes"],
    } },
  // Head clash (the duel with the Triceratops): the two lock heads and shove `shoves` times, `every` s apart; each shove pushes the
  // foe back `push` tiles and lands a blow.
  clash: { shoves: 3, every: .55, push: .6 },
  text: {
    armor: "Plates slam shut over its hide with a grinding of gears: the Pachycephalosaurus is armored, a machine of itself!",
    armorOff: "Its plating clanks open and falls away.",
    fossil: "Its flesh splits and sloughs off! The Pachycephalosaurus fights on as bare fossil bone.",
    burst: "The odd rock cracks open: it was the Pachycephalosaurus, and it is hungry!",
    daze: "The dome rings your skull: you are dazed!",
  },
};
// The moves (spread into monster-pack.ts ATTACK_MODULES). Times are seconds; `damage` multiplies the creature's damage.
export const PACHY_ATTACKS = {
  pachyHeadSlam: { id: "pachyHeadSlam", name: "Dome Slam", range: [0, 3.8], cooldown: 4, windup: .75, active: .3, recover: .8, damage: 1.3, tags: ["melee", "ground"], text: "It rears up, the marked circle following you, and brings its dome down like a hammer; the ground rings out from it. Out of the circle, then jump the ring." },
  pachyCharge: { id: "pachyCharge", name: "Dome Charge", range: [3, 12], cooldown: 7, windup: .85, active: 1.4, recover: .8, damage: 1.45, tags: ["charge"], text: "It lowers its head and paws the ground, then charges down the lane, dome first. Dodge across the lane; into a wall it bonks itself senseless." },
  pachyRockLaunch: { id: "pachyRockLaunch", name: "Dome Flick", range: [3, 11], cooldown: 9, windup: .7, active: 1, recover: .6, damage: .55, tags: ["ranged", "ground"], text: "It digs its dome under the ground and flicks rocks high into the air; they fall on the marked spots." },
  pachyJumpSlam: { id: "pachyJumpSlam", name: "Leaping Stomp", range: [3, 10], cooldown: 8, windup: .7, active: 1.1, recover: .8, damage: 1.5, tags: ["ground", "leap"], text: "It crouches, the landing circle following you, then leaps and comes down feet first; the ground rings out. Out of the circle, then jump the ring." },
  pachyBicycle: { id: "pachyBicycle", name: "Wheeling Kicks", range: [2.5, 11], cooldown: 10, windup: .75, active: 2.1, recover: .9, damage: .6, tags: ["charge", "leap"], text: "It jumps and comes down the lane in hops, pedalling its legs in kick after kick. Step off the lane." },
  pachyDomeDrum: { id: "pachyDomeDrum", name: "Dome Drum", range: [0, 4], cooldown: 8, windup: .8, active: 2.6, recover: .9, damage: .85, tags: ["melee", "ground"], text: "It plants its feet and drums its dome on the ground, knock after knock, each knock on the marked circle and a burst ring running out. Two blows of its head or its rings and you are dazed: keep out of the circle and jump the rings." },
  pachyDomeRam: { id: "pachyDomeRam", name: "Dome Butts", range: [0, 3.2], cooldown: 5, windup: .5, active: 1.3, recover: .6, damage: .7, tags: ["melee", "combo"], text: "Three short head-butts in a row, stepping in after you with each." },
  pachyBoneSpikes: { id: "pachyBoneSpikes", name: "Bone Spikes", range: [1, 8], cooldown: 7, windup: .65, active: 1.1, recover: .6, damage: 1.05, fossil: true, tags: ["ground"], text: "Bone only: it stamps and spikes of fossil bone burst from the ground in a line toward you, one after another." },
  pachySkullLaunch: { id: "pachySkullLaunch", name: "Skull Volley", range: [4, 14], cooldown: 9, windup: .85, active: 1.5, recover: .7, damage: .8, fossil: true, tags: ["ranged"], text: "Bone only: it flings fossil skulls at you across the room, one after another, each turning a little after you. Dodge late." },
  pachyAmbush: { id: "pachyAmbush", name: "Rock Burst", range: [0, 99], cooldown: 999, windup: .45, active: .3, recover: .7, damage: 1.2, tags: ["ground", "ambush"], text: "The odd rock was the beast: it bursts out round itself and the ground rings. Back away from odd rocks, or strike first." },
  pachyClash: { id: "pachyClash", name: "Head Clash", range: [0, 3.6], cooldown: 9, windup: .6, active: 1.8, recover: .7, damage: .6, duel: true, tags: ["melee", "duel"], text: "The dino duel only: it locks heads with its foe and shoves, and shoves again." },
};
// Its vitals against the Wayfarer: the same profile shape as a world beast's row (world-beasts.ts beastProfileVitals), at the
// Spinosaurus's level. It is no roaming world beast (no hunt, tries, retreat or bounty): a big-room or ambush foe of that ground.
export const PACHY_PROFILE = { name: "The Pachycephalosaurus", hitsToKill: 54, hpPerLevel: 25, damageShare: .21, speed: 1.15, attackGap: .26, staggerResistance: .95 };
// Big rooms (as the Wild Stegosaurus's, wild-stego.ts): a great building's floor or an adventure Pentagon's chamber first generated
// from this version on (pinned on the floor's own history as `pachyRooms` by game.ts generatePinnedDungeon) may hold one in its biggest
// open square, unless a stego, Spinosaurus or Earth Apatosaurus already holds that room. At `disguised` of them it lies as a rock.
export const PACHY_ROOMS = { version: 1, chance: .1, side: 9, disguised: .5 };
// The overworld ambush: a section first seen from this version on (its atlas entry pins `pachyAmbushVersion`) may hold one, lying
// as a rock, at `perThousand` ‰, at least `minDepth` sections from Ember Refuge, `fromEdge` tiles in from the section's edges.
export const PACHY_AMBUSH = { version: 1, perThousand: 30, minDepth: 6, fromEdge: 6, tries: 24 };
export const isPachy = (e) => e?.kind === PACHY_KIND;
export const pachyTuned = (e) => !!(e?.pachyRoom || e?.pachyAmbush);

// ---------------------------------------------------------------- the shared helpers monster-pack.ts hands over
let K = null;
export function installPachyKit(kit) { K = kit; }
const hyp = Math.hypot;
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)); return hyp(px - (ax + vx * t), py - (ay + vy * t)); }
const wrapAngle = (a) => ((a % TAU) + TAU * 1.5) % TAU - Math.PI;
export function pachyHeading(e) { const h = e.pachyHeading; if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y) || !(h.x || h.y)) e.pachyHeading = { x: e.facingX < 0 ? -1 : 1, y: 0 }; return e.pachyHeading; }
function face(e, x, y) { const m = hyp(x, y); if (!(m > 1e-9)) return; const h = pachyHeading(e); h.x = x / m; h.y = y / m; if (Math.abs(h.x) > .05) e.facingX = h.x >= 0 ? 1 : -1; }
function turnToward(e, x, y, rate, dt) { const h = pachyHeading(e), cur = Math.atan2(h.y, h.x), diff = wrapAngle(Math.atan2(y - e.y, x - e.x) - cur), a = cur + Math.max(-rate * dt, Math.min(rate * dt, diff)); face(e, Math.cos(a), Math.sin(a)); }
const frac = (key) => (hashSeed(key) % 1000) / 1000;
const open = (w, x, y) => !w.open || w.open(x, y);
function preyOf(w, s) { const id = s?.data?.prey; if (!id) return null; for (const q of w.enemies || []) if (q.id === id && !q.dead) return q; return null; }
function quarry(w, s) { return preyOf(w, s) || w.player; }
const dmg = (e, id, share = 1) => Math.max(1, Math.ceil(K.damageOf(e, id) * share));
const isRival = (e, q) => !!q && PACHY.duel.kinds.includes(q.kind) && K.duelPair(e, q);
// A blow in the circle (x0, y0, r), or within r of the segment to (x1, y1) when `seg`: on the Wayfarer, and on its prey (a duel foe:
// measured to the near side of its bulk; an ordinary creature: most of its health, and eaten if it dies). True if anything was hit.
const within = (x, y, seg, x0, y0, x1, y1, r) => seg ? segDist(x, y, x0, y0, x1, y1) <= r : hyp(x - x0, y - y0) <= r;
// A blow of its head (PACHY.daze.head) that lands on the Wayfarer counts toward the daze: `youHit` and `youDazed` say what the last
// strike did to her (read straight after it; a module scratch pair, so nothing is allocated).
let youHit = false, youDazed = false;
// One counted blow (game.ts dazeHit): true if it stunned her; the pools keep a running count of the dazes it has dealt (`dazed`).
function daze(e, w) { const ok = !!w.dazeHit?.(e); if (ok) pachyPools(e).dazed++; return ok; }
function strike(e, s, w, id, x0, y0, r, share = 1, seg = false, x1 = 0, y1 = 0, opts = null) {
  const p = w.player, n = dmg(e, id, share); let landed = false; youHit = false; youDazed = false;
  if (within(p.x, p.y, seg, x0, y0, x1, y1, r) && (!w.los || w.los(e, p))) landed = !!w.hurt(e, n, { jumpable: !!opts?.jumpable, source: id });
  if (landed) { youHit = true; if (PACHY.daze.head.includes(id)) youDazed = daze(e, w); }
  if (landed && opts?.push) w.push?.(e, opts.push, r + 1);
  const prey = preyOf(w, s); if (prey) landed = hitPrey(e, w, prey, x0, y0, r, n, id, seg, x1, y1) || landed;
  return landed;
}
function hitPrey(e, w, q, x0, y0, r, n, id, seg = false, x1 = 0, y1 = 0) {
  if (!q || q.dead) return false;
  if (isRival(e, q)) { const at = K.duelReachPoint(e, q); if (!within(at.x, at.y, seg, x0, y0, x1, y1, r + K.bodyRadius(q) * .3)) return false; K.woundRival(w, e, q, Math.max(n, Math.ceil((Number(q.maxHp) || 1) * PACHY.duel.share))); K.cue(w, e, "hit", id, q, { victim: q.kind }); return true; }
  if (!within(q.x, q.y, seg, x0, y0, x1, y1, r + K.bodyRadius(q) * .5)) return false;
  w.hurtCreature?.(e, q, Math.max(n, Math.ceil((Number(q.maxHp) || 1) * PACHY.hunt.share)));
  if (q.dead || !(q.hp > 0)) { q.noRewards = true; e.dinoFeed = Math.max(Number(e.dinoFeed) || 0, PACHY.hunt.feed); } // it eats what it kills
  return true;
}

// ---------------------------------------------------------------- the pools (one allocation, on first sight)
function pool(n, make) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = make(); return a; }
export function pachyPools(e) {
  if (e.pachyFx && e.pachyFx.v === PACHY.version) { if (!Number.isFinite(e.pachyFx.dazed)) e.pachyFx.dazed = 0; return e.pachyFx; } // (pools from before the daze: its count starts at 0)
  const C = PACHY.caps;
  e.pachyFx = {
    v: PACHY.version, dazed: 0,
    rocks: pool(C.rocks, () => ({ on: false, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, total: 0, delay: 0, dmg: 0, prey: null })),
    skulls: pool(C.skulls, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, left: 0, dmg: 0, spin: 0, prey: null })),
    bones: pool(C.bones, () => ({ on: false, x: 0, y: 0, t: 0, warn: 0, up: 0, hit: false, dmg: 0, prey: null })),
    waves: pool(C.waves, () => ({ on: false, x: 0, y: 0, r: 0, max: 0, t: 0, total: 0, hit: false, preyHit: false, dmg: 0, prey: null, counted: false })),
  };
  return e.pachyFx;
}
function take(list) { for (let i = 0; i < list.length; i++) if (!list[i].on) return list[i]; return null; }
export function pachyLive(e, kind) { const L = e?.pachyFx?.[kind]; if (!L) return 0; let n = 0; for (let i = 0; i < L.length; i++) if (L[i].on) n++; return n; }
function clearPools(e) { const F = e.pachyFx; if (!F) return; for (const k of ["rocks", "skulls", "bones", "waves"]) for (const q of F[k] || []) q.on = false; }
function target(w, id) { if (!id) return null; for (const q of w.enemies || []) if (q.id === id && !q.dead) return q; return null; }
// A burst ring out from (x, y) to `max` tiles over `total` s. `counted`: the blow it rings out from already counted toward the daze
// (one knock, one count).
function wave(e, w, x, y, max, n, prey, counted = false, total = .5) { const q = take(pachyPools(e).waves); if (!q) return; q.on = true; q.x = x; q.y = y; q.r = 0; q.max = max; q.t = 0; q.total = total; q.hit = false; q.preyHit = false; q.dmg = n; q.prey = prey || null; q.counted = !!counted; }
// The pose contract's resting values.
export const pachyPoseDefaults = () => ({ pachyPose: null, pachyAir: 0 });
// A reload: no move or hazard resumes mid-way; its form, the armor's time left, the thresholds it has used and the disguise are kept.
export function resetPachyRuntime(e) {
  Object.assign(e, pachyPoseDefaults()); clearPools(e);
  e.pachyForm = ["flesh", "armor", "fossil"].includes(e.pachyForm) ? e.pachyForm : "flesh";
  e.pachyArmorLeft = Math.max(0, Math.min(PACHY.forms.armor.time, Number(e.pachyArmorLeft) || 0)); if (e.pachyForm === "armor" && !(e.pachyArmorLeft > 0)) e.pachyForm = "flesh";
  e.pachyArmorUsed = Math.max(0, Math.min(PACHY.forms.armor.at.length, Math.floor(Number(e.pachyArmorUsed) || 0)));
  e.pachyShift = e.pachyForm === "flesh" ? 0 : 1; e.pachyDisguised = e.pachyDisguised === true; e.aloft = false;
  e.pachyHpSeen = Number(e.hp) || 0; delete e.pachyHeldBy;
  return e;
}

// ---------------------------------------------------------------- every frame: the pools
function tickPools(e, w) {
  const F = pachyPools(e), dt = w.dt, p = w.player;
  const R = PACHY.rocks;
  for (const q of F.rocks) { if (!q.on) continue; if (q.delay > 0) { q.delay -= dt; continue; } q.t += dt; if (q.t < q.total) continue;
    q.on = false; if (hyp(p.x - q.tx, p.y - q.ty) <= R.radius + .15) w.hurt(e, q.dmg, { jumpable: false, source: "pachyRockLaunch" }); hitPrey(e, w, target(w, q.prey), q.tx, q.ty, R.radius, q.dmg, "pachyRockLaunch"); K.cue(w, e, "rock", "pachyRockLaunch", { x: q.tx, y: q.ty }); }
  const S = PACHY.skulls;
  for (const q of F.skulls) { if (!q.on) continue; q.left -= dt; q.spin += dt * 9;
    const foe = target(w, q.prey), tx = foe ? foe.x : p.x, ty = foe ? foe.y : p.y, cur = Math.atan2(q.vy, q.vx), diff = wrapAngle(Math.atan2(ty - q.y, tx - q.x) - cur), a = cur + Math.max(-S.turn * dt, Math.min(S.turn * dt, diff));
    q.vx = Math.cos(a) * S.speed; q.vy = Math.sin(a) * S.speed; const ox = q.x, oy = q.y; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.left <= 0 || (w.tileOpen && !w.tileOpen(q.x + .5, q.y + .5))) { q.on = false; continue; }
    if (segDist(p.x, p.y, ox, oy, q.x, q.y) <= S.radius + .25) { q.on = false; w.hurt(e, q.dmg, { jumpable: false, source: "pachySkullLaunch" }); continue; }
    if (foe && hitPrey(e, w, foe, q.x, q.y, S.radius + .4, q.dmg, "pachySkullLaunch")) q.on = false; }
  const B = PACHY.bones;
  for (const q of F.bones) { if (!q.on) continue; q.t += dt;
    if (!q.hit && q.t >= q.warn) { q.hit = true; if (hyp(p.x - q.x, p.y - q.y) <= B.radius + .15) w.hurt(e, q.dmg, { jumpable: false, source: "pachyBoneSpikes" }); hitPrey(e, w, target(w, q.prey), q.x, q.y, B.radius, q.dmg, "pachyBoneSpikes"); }
    if (q.t >= q.warn + q.up) q.on = false; }
  for (const q of F.waves) { if (!q.on) continue; q.t += dt; const k = Math.min(1, q.t / q.total); q.r = q.max * k;
    if (!q.hit && Math.abs(hyp(p.x - q.x, p.y - q.y) - q.r) < .45) { q.hit = true; if (w.hurt(e, q.dmg, { jumpable: true, source: "pachyWave" }) && PACHY.daze.rings && !q.counted) daze(e, w); }
    const foe = target(w, q.prey); if (foe && !q.preyHit && Math.abs(hyp(foe.x - q.x, foe.y - q.y) - q.r) < K.bodyRadius(foe) + .4) { q.preyHit = true; hitPrey(e, w, foe, foe.x, foe.y, 99, q.dmg, "pachyWave"); }
    if (k >= 1) q.on = false; }
}

// ---------------------------------------------------------------- the forms
const armored = (e) => e.pachyForm === "armor" && e.pachyArmorLeft > 0;
// The armor's toughness: whatever took health from it since last frame (any blow, any source) is given back but `taken` of it while
// it is armored and alive. One rule for every damage path the game has, so no blow ever skips it.
function guardHp(e) {
  const hp = Number(e.hp) || 0, seen = Number.isFinite(e.pachyHpSeen) ? e.pachyHpSeen : hp;
  if (armored(e) && hp > 0 && hp < seen) e.hp = Math.min(Number(e.maxHp) || hp, hp + (seen - hp) * (1 - PACHY.forms.armor.taken));
  e.pachyHpSeen = Number(e.hp) || 0;
}
// Its form turns at its health thresholds: true while it shifts (its frame spent).
function forms(e, s, w) {
  const F = PACHY.forms, dt = w.dt, hp = Number(e.hp) || 0, max = Number(e.maxHp) || 1;
  if (e.pachyForm !== "fossil" && hp > 0 && hp <= max * F.fossil.at) {
    if (s.attack) K.endAttack(e, s); clearShots(e); e.pachyForm = "fossil"; e.pachyArmorLeft = 0; e.pachyShift = 0; e.pachyAir = 0; e.aloft = false; e.pachyArmorUsed = F.armor.at.length;
    s.pachyShifting = F.fossil.shed; e.pachyPose = "shed"; w.say?.(PACHY.text.fossil); w.pachyForm?.(e, "fossil"); K.cue(w, e, "shed", "pachyFossil");
  } else if (e.pachyForm === "flesh" && !e.pachyDisguised && (e.pachyArmorUsed || 0) < F.armor.at.length && hp > 0 && hp <= max * F.armor.at[e.pachyArmorUsed || 0]) {
    if (s.attack) K.endAttack(e, s); while ((e.pachyArmorUsed || 0) < F.armor.at.length && hp <= max * F.armor.at[e.pachyArmorUsed || 0]) e.pachyArmorUsed = (e.pachyArmorUsed || 0) + 1;
    e.pachyForm = "armor"; e.pachyArmorLeft = F.armor.time; e.pachyShift = 0; s.pachyShifting = F.armor.shift; e.pachyPose = "armorUp"; e.pachyAir = 0; e.aloft = false;
    w.say?.(PACHY.text.armor); w.pachyForm?.(e, "armor"); K.cue(w, e, "armor", "pachyArmor");
  }
  if (s.pachyShifting > 0) {
    s.pachyShifting -= dt; const T = e.pachyForm === "fossil" ? F.fossil.shed : F.armor.shift; e.pachyShift = Math.min(1, 1 - Math.max(0, s.pachyShifting) / T);
    e.pachyPose = s.pachyShifting > 0 ? (e.pachyForm === "fossil" ? "shed" : "armorUp") : null; if (s.pachyShifting <= 0) e.pachyShift = 1;
    return s.pachyShifting > 0;
  }
  if (e.pachyForm === "armor") { e.pachyArmorLeft = Math.max(0, (Number(e.pachyArmorLeft) || 0) - dt); if (e.pachyArmorLeft <= 0) { e.pachyForm = "flesh"; e.pachyShift = 0; w.say?.(PACHY.text.armorOff); w.pachyForm?.(e, "flesh"); K.cue(w, e, "armorOff", "pachyArmor"); } }
  return false;
}
function clearShots(e) { const F = e.pachyFx; if (!F) return; for (const q of F.rocks) q.on = false; }

// ---------------------------------------------------------------- the disguise
// While it lies as a rock it does nothing; the Wayfarer within `reveal` (or a blow on it, a rival in sight, a bait's scent: anything
// that rouses it) and it bursts out. True while its frame is spent lying still.
function disguise(e, s, w) {
  if (!e.pachyDisguised) return false;
  const p = w.player, d = hyp(p.x - e.x, p.y - e.y), hurt = (Number(e.hp) || 0) < (Number(e.pachyHpSeen) || 0) - .5;
  e.pachyPose = "rock"; e.pachyAir = 0;
  if (!(d <= PACHY.ambush.reveal || hurt || e.aggro || rivalNear(e, w))) { e.aggro = false; return true; }
  e.pachyDisguised = false; e.aggro = true; face(e, p.x - e.x, p.y - e.y);
  if (s.attack) K.endAttack(e, s); s.cd = s.cd || {}; s.gap = 0; s.state = "attack"; s.last = "pachyAmbush"; K.beginAttack(e, s, "pachyAmbush", w);
  w.say?.(PACHY.text.burst); w.pachyReveal?.(e); return false;
}

// ---------------------------------------------------------------- every frame (before the shared brain)
// Its pools, its armor's toughness, the disguise and its form turns. True when its frame is spent.
export function pachyFrame(e, s, w) {
  if (!(w.dt > 0)) return false;
  if (e.dead) { clearPools(e); e.pachyAir = 0; return true; }
  if (!e.pachyHeading) face(e, w.player.x - e.x, w.player.y - e.y);
  const hp = Number(e.hp) || 0, wasHurt = hp < (Number(e.pachyHpSeen) || 0) - .5;
  if (e.pachyDisguised) { if (disguise(e, s, w)) { e.pachyHpSeen = hp; return true; } }
  else if (wasHurt) e.aggro = true;
  guardHp(e); tickPools(e, w);
  return forms(e, s, w);
}

// ---------------------------------------------------------------- the moves
function windupOf(s, id) { return s.windupTotal || PACHY_ATTACKS[id]?.windup || .5; }
function aimPoint(e, t, reach, out) { const max = K.bodyRadius(e) + reach, dx = t.x - e.x, dy = t.y - e.y, m = hyp(dx, dy); if (m <= max) { out.x = t.x; out.y = t.y; } else { out.x = e.x + dx / m * max; out.y = e.y + dy / m * max; } return out; }
function landing(e, w, to) { if (open(w, to.x, to.y)) return to; for (let r = .5; r <= 2.5; r += .5) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = to.x + Math.cos(a) * r, y = to.y + Math.sin(a) * r; if (open(w, x, y)) return { x, y }; } return { x: e.x, y: e.y }; }
const P0 = { x: 0, y: 0 };
export const PACHY_START = {
  pachyHeadSlam(e, s) { const A = PACHY.slam; s.windupTotal = s.t; s.data.mark = aimPoint(e, s.data.target, A.reach, { x: 0, y: 0 }); s.tele = { type: "circle", x: s.data.mark.x, y: s.data.mark.y, radius: A.radius }; e.pachyPose = "slamRaise"; face(e, s.data.aim.x, s.data.aim.y); },
  pachyCharge(e, s, w) { s.windupTotal = s.t; s.data.dir = { x: s.data.aim.x, y: s.data.aim.y }; s.tele = { type: "lane", aim: s.data.dir, length: K.rayLength(w, e, s.data.dir, PACHY.charge.run), width: PACHY.charge.width * 2 }; e.pachyPose = "chargeReady"; face(e, s.data.aim.x, s.data.aim.y); },
  pachyRockLaunch(e, s, w) { s.windupTotal = s.t; e.pachyPose = "domeLoad"; s.tele = null; s.data.marks = rockMarks(e, s, w); face(e, s.data.aim.x, s.data.aim.y); },
  pachyJumpSlam(e, s, w) { const J = PACHY.jump; s.windupTotal = s.t; s.data.mark = aimPoint(e, s.data.target, J.max, { x: 0, y: 0 }); s.tele = { type: "circle", x: s.data.mark.x, y: s.data.mark.y, radius: J.radius }; e.pachyPose = "crouch"; face(e, s.data.aim.x, s.data.aim.y); },
  pachyBicycle(e, s, w) { const B = PACHY.bicycle; s.windupTotal = s.t; s.data.dir = { x: s.data.aim.x, y: s.data.aim.y }; s.data.len = K.rayLength(w, e, s.data.dir, B.dist); s.tele = { type: "lane", aim: s.data.dir, length: s.data.len, width: B.radius * 2 }; e.pachyPose = "crouch"; face(e, s.data.aim.x, s.data.aim.y); },
  pachyDomeDrum(e, s) { const D = PACHY.drum, d = s.data; s.windupTotal = s.t; d.count = pachyDrumKnocks(e, s.seq); d.dazed = pachyPools(e).dazed; d.n = 0; d.next = 0; d.mark = aimPoint(e, d.target, D.reach, { x: 0, y: 0 }); s.tele = { type: "circle", x: d.mark.x, y: d.mark.y, radius: D.radius }; e.pachyPose = "drumRaise"; face(e, d.aim.x, d.aim.y); },
  pachyDomeRam(e, s) { const B = PACHY.butt; s.windupTotal = s.t; s.data.n = 0; s.data.next = 0; s.tele = { type: "arc", aim: s.data.aim, radius: K.bodyRadius(e) + B.reach, arc: B.arc }; e.pachyPose = "chargeReady"; face(e, s.data.aim.x, s.data.aim.y); },
  pachyBoneSpikes(e, s, w) { s.windupTotal = s.t; e.pachyPose = "boneStamp"; s.tele = { type: "lane", aim: s.data.aim, length: K.bodyRadius(e) + PACHY.bones.count * PACHY.bones.spacing, width: PACHY.bones.radius * 2 }; face(e, s.data.aim.x, s.data.aim.y); },
  pachySkullLaunch(e, s) { s.windupTotal = s.t; s.data.n = 0; s.data.next = 0; e.pachyPose = "skullReady"; s.tele = { type: "brace" }; face(e, s.data.aim.x, s.data.aim.y); },
  pachyAmbush(e, s) { s.windupTotal = s.t; e.pachyPose = "burst"; s.tele = { type: "ring", radius: PACHY.ambush.radius }; },
  pachyClash(e, s) { s.windupTotal = s.t; s.data.n = 0; s.data.next = 0; e.pachyPose = "chargeReady"; s.tele = { type: "arc", aim: s.data.aim, radius: K.bodyRadius(e) + PACHY.butt.reach, arc: 70 }; face(e, s.data.aim.x, s.data.aim.y); },
};
// Dome Drum's mark: it follows the quarry while the head is up, holding once `lock`; the circle drawn on it and the body facing it.
function drumFollow(e, s, w, lock) { const D = PACHY.drum, d = s.data, q = quarry(w, s);
  if (!lock) { const k = Math.min(1, w.dt * D.follow); P0.x = d.mark.x + (q.x - d.mark.x) * k; P0.y = d.mark.y + (q.y - d.mark.y) * k; aimPoint(e, P0, D.reach, d.mark); }
  if (s.tele) { s.tele.x = d.mark.x; s.tele.y = d.mark.y; s.tele.locked = lock; } face(e, d.mark.x - e.x, d.mark.y - e.y); }
// Dome Drum's knock count for this beast's move `seq` (hashed: the same every time, between PACHY.drum.knocks).
export function pachyDrumKnocks(e, seq) { const [lo, hi] = PACHY.drum.knocks; return lo + hashSeed(`${e?.id}:pachy-drum:${seq}`) % (hi - lo + 1); }
function rockMarks(e, s, w) {
  const R = PACHY.rocks, t = s.data.target, out = [{ x: t.x, y: t.y }];
  for (let i = 1; i < R.count; i++) { const k = `${e.id}:pachy-rock:${s.seq}:${i}`, a = frac(k) * TAU, r = R.ring[0] + (R.ring[1] - R.ring[0]) * frac(`${k}:r`), x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r; if (open(w, x, y)) out.push({ x, y }); }
  return out;
}
const A_ = (id) => PACHY_ATTACKS[id];
export const PACHY_RUN = {
  pachyHeadSlam(e, s, w) {
    const A = PACHY.slam, d = s.data;
    if (s.phase === "windup") { const q = quarry(w, s); if (s.t > A.lockAt) { const k = Math.min(1, w.dt * A.follow); P0.x = d.mark.x + (q.x - d.mark.x) * k; P0.y = d.mark.y + (q.y - d.mark.y) * k; aimPoint(e, P0, A.reach, d.mark); } else s.tele.locked = true;
      s.tele.x = d.mark.x; s.tele.y = d.mark.y; face(e, d.mark.x - e.x, d.mark.y - e.y);
      if (s.t <= 0) { e.pachyPose = "slam"; s.tele = null; strike(e, s, w, "pachyHeadSlam", d.mark.x, d.mark.y, A.radius + .15); wave(e, w, d.mark.x, d.mark.y, A.ring, dmg(e, "pachyHeadSlam", A.ringShare), d.prey, youHit); K.cue(w, e, "land", "pachyHeadSlam", d.mark); K.toPhase(s, "active", A_("pachyHeadSlam").active); }
      return; }
    if (s.phase === "active" && s.t <= 0) K.toPhase(s, "recover", A_("pachyHeadSlam").recover);
  },
  pachyCharge(e, s, w) {
    const C = PACHY.charge, d = s.data;
    if (s.phase === "windup") { if (s.t > C.lockAt) { const q = quarry(w, s), want = Math.atan2(q.y - e.y, q.x - e.x), cur = Math.atan2(d.dir.y, d.dir.x), a = cur + Math.max(-C.turn * w.dt, Math.min(C.turn * w.dt, wrapAngle(want - cur))); d.dir.x = Math.cos(a); d.dir.y = Math.sin(a); s.tele.length = K.rayLength(w, e, d.dir, C.run); } else s.tele.locked = true;
      face(e, d.dir.x, d.dir.y); if (s.t <= 0) { d.went = 0; d.hit = false; e.pachyPose = "charge"; K.toPhase(s, "active", A_("pachyCharge").active); K.cue(w, e, "swing", "pachyCharge"); } return; }
    if (s.phase === "recover") { if (s.t <= 0) e.pachyPose = null; return; }
    const step = Math.min(C.speed * w.dt, C.run - d.went), bx = e.x, by = e.y, moved = step > 0 && w.move(e, d.dir.x * step, d.dir.y * step);
    if (moved) d.went += step; if (s.tele) s.tele = null;
    if (!d.hit && strike(e, s, w, "pachyCharge", bx, by, C.width, 1, true, e.x, e.y, { push: C.push })) { d.hit = true; K.cue(w, e, "hit", "pachyCharge"); }
    if (!moved && step > 0) { e.pachyPose = "bonk"; K.cue(w, e, "land", "pachyBonk"); w.shake?.(.25, .3); K.toPhase(s, "recover", A_("pachyCharge").recover + C.bonk); return; }
    if (d.went >= C.run - 1e-6 || s.t <= 0) { e.pachyPose = null; K.toPhase(s, "recover", A_("pachyCharge").recover); }
  },
  pachyRockLaunch(e, s, w) {
    const R = PACHY.rocks, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { const F = pachyPools(e), n = dmg(e, "pachyRockLaunch"); let i = 0;
        for (const m of d.marks) { const q = take(F.rocks); if (!q) break; q.on = true; q.fx = e.x; q.fy = e.y; q.tx = m.x; q.ty = m.y; q.t = 0; q.total = R.flight; q.delay = i * R.stagger; q.dmg = n; q.prey = d.prey || null; i++; }
        e.pachyPose = "domeFlick"; K.cue(w, e, "fling", "pachyRockLaunch", e, { land: R.flight }); K.toPhase(s, "active", A_("pachyRockLaunch").active); }
      return; }
    if (s.phase === "active" && s.t <= 0) { e.pachyPose = null; K.toPhase(s, "recover", A_("pachyRockLaunch").recover); }
  },
  pachyJumpSlam(e, s, w) {
    const J = PACHY.jump, d = s.data;
    if (s.phase === "windup") { const q = quarry(w, s); if (s.t > J.lockAt) { const k = Math.min(1, w.dt * J.follow); P0.x = d.mark.x + (q.x - d.mark.x) * k; P0.y = d.mark.y + (q.y - d.mark.y) * k; aimPoint(e, P0, J.max, d.mark); } else s.tele.locked = true;
      s.tele.x = d.mark.x; s.tele.y = d.mark.y; face(e, d.mark.x - e.x, d.mark.y - e.y);
      if (s.t <= 0) { const to = landing(e, w, d.mark); d.from = { x: e.x, y: e.y }; d.to = { x: to.x, y: to.y }; d.left = J.time; e.pachyPose = "air"; e.aloft = true; K.toPhase(s, "active", A_("pachyJumpSlam").active); K.cue(w, e, "leap", "pachyJumpSlam"); }
      return; }
    if (s.phase === "recover") { e.pachyAir = 0; if (s.t <= 0) e.pachyPose = null; return; }
    if (d.left > 0) { d.left -= w.dt; const k = Math.min(1, 1 - Math.max(0, d.left) / J.time); e.x = d.from.x + (d.to.x - d.from.x) * k; e.y = d.from.y + (d.to.y - d.from.y) * k; e.pachyAir = Math.sin(Math.PI * k) * J.height;
      if (d.left <= 0) { e.x = d.to.x; e.y = d.to.y; e.pachyAir = 0; e.aloft = false; e.pachyPose = "land"; s.tele = null;
        strike(e, s, w, "pachyJumpSlam", d.to.x, d.to.y, J.radius + .15); wave(e, w, d.to.x, d.to.y, J.ring, dmg(e, "pachyJumpSlam", J.ringShare), d.prey, youHit); K.cue(w, e, "land", "pachyJumpSlam", d.to); }
      return; }
    if (s.t <= 0) K.toPhase(s, "recover", A_("pachyJumpSlam").recover);
  },
  pachyBicycle(e, s, w) {
    const B = PACHY.bicycle, d = s.data;
    if (s.phase === "windup") { face(e, d.dir.x, d.dir.y); if (s.t <= 0) { d.from = { x: e.x, y: e.y }; d.k = 0; d.kick = 0; e.aloft = true; e.pachyPose = "kickL"; s.tele = null; K.toPhase(s, "active", A_("pachyBicycle").active); K.cue(w, e, "leap", "pachyBicycle"); } return; }
    if (s.phase === "recover") { e.pachyAir = 0; e.aloft = false; if (s.t <= 0) e.pachyPose = null; return; }
    d.k = Math.min(1, d.k + w.dt / B.time);
    const want = d.len * d.k, nx = d.from.x + d.dir.x * want, ny = d.from.y + d.dir.y * want; if (open(w, nx, ny)) { e.x = nx; e.y = ny; }
    const phase = d.k * B.kicks; e.pachyAir = Math.abs(Math.sin(Math.PI * phase)) * B.height; e.pachyPose = Math.floor(phase) % 2 ? "kickR" : "kickL";
    if (Math.floor(phase) >= d.kick && d.kick < B.kicks && phase - Math.floor(phase) >= .5) { d.kick++; strike(e, s, w, "pachyBicycle", e.x, e.y, K.bodyRadius(e) * .4 + B.radius); K.cue(w, e, "swing", "pachyBicycle"); }
    if (d.k >= 1 || s.t <= 0) { e.pachyAir = 0; e.aloft = false; e.pachyPose = "land"; K.cue(w, e, "land", "pachyBicycle"); K.toPhase(s, "recover", A_("pachyBicycle").recover); }
  },
  // Dome Drum: the head up (the mark following, then holding), the knock (a head blow and a burst ring), beat after beat.
  pachyDomeDrum(e, s, w) {
    const D = PACHY.drum, d = s.data;
    if (s.phase === "windup") { drumFollow(e, s, w, s.t <= D.lockAt); if (s.t <= 0) { d.n = 0; d.next = 0; K.toPhase(s, "active", A_("pachyDomeDrum").active); } return; }
    if (s.phase === "recover") { if (s.t <= 0) e.pachyPose = null; return; }
    d.next -= w.dt;
    if (D.endOnDaze && pachyPools(e).dazed !== d.dazed) d.n = d.count; // she is down (a knock or a ring dazed her): the drum is done
    if (d.n < d.count && d.next <= 0) { // the knock
      strike(e, s, w, "pachyDomeDrum", d.mark.x, d.mark.y, D.radius + .15); const dazed = youDazed;
      wave(e, w, d.mark.x, d.mark.y, D.ring, dmg(e, "pachyDomeDrum", D.ringShare), d.prey, youHit, D.ringTime);
      K.cue(w, e, "land", "pachyDomeDrum", d.mark); d.n++; d.next = D.every; e.pachyPose = "drum";
      if (dazed && D.endOnDaze) d.n = d.count; // she is down: no knock after this one
    }
    const down = d.next > D.every * (1 - D.down);
    if (d.n < d.count) { e.pachyPose = down ? "drum" : "drumRaise"; if (!down) drumFollow(e, s, w, d.next <= D.lockAt); if (s.tele == null && !down) s.tele = { type: "circle", x: d.mark.x, y: d.mark.y, radius: D.radius }; else if (down) s.tele = null; }
    else { s.tele = null; e.pachyPose = "drum"; }
    if (d.n >= d.count && d.next <= D.every * (1 - D.down) || s.t <= 0) { e.pachyPose = null; s.tele = null; K.toPhase(s, "recover", A_("pachyDomeDrum").recover); }
  },
  pachyDomeRam(e, s, w) { butts(e, s, w, "pachyDomeRam", PACHY.butt.butts, PACHY.butt.every, "butt", 0); },
  pachyClash(e, s, w) { butts(e, s, w, "pachyClash", PACHY.clash.shoves, PACHY.clash.every, "clash", PACHY.clash.push); },
  pachyBoneSpikes(e, s, w) {
    const B = PACHY.bones, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) { const F = pachyPools(e), n = dmg(e, "pachyBoneSpikes"), r0 = K.bodyRadius(e) + .6;
        for (let i = 0; i < B.count; i++) { const x = e.x + d.aim.x * (r0 + i * B.spacing), y = e.y + d.aim.y * (r0 + i * B.spacing); if (!open(w, x, y)) break; const q = take(F.bones); if (!q) break; q.on = true; q.x = x; q.y = y; q.t = 0; q.warn = B.warn + i * B.stagger; q.up = B.up; q.hit = false; q.dmg = n; q.prey = d.prey || null; }
        s.tele = null; e.pachyPose = "boneStamp"; K.cue(w, e, "land", "pachyBoneSpikes"); K.toPhase(s, "active", A_("pachyBoneSpikes").active); }
      return; }
    if (s.phase === "active" && s.t <= 0) { e.pachyPose = null; K.toPhase(s, "recover", A_("pachyBoneSpikes").recover); }
  },
  pachySkullLaunch(e, s, w) {
    const S = PACHY.skulls, d = s.data;
    if (s.phase === "windup") { const q = quarry(w, s); face(e, q.x - e.x, q.y - e.y); if (s.t <= 0) { s.tele = null; K.toPhase(s, "active", A_("pachySkullLaunch").active); } return; }
    if (s.phase === "recover") { if (s.t <= 0) e.pachyPose = null; return; }
    d.next -= w.dt; e.pachyPose = d.next > S.every * .5 ? "skullThrow" : "skullReady";
    if (d.n < S.count && d.next <= 0) { const q = take(pachyPools(e).skulls), at = quarry(w, s), h = pachyHeading(e), r = K.bodyRadius(e) * .9;
      d.n++; d.next = S.every;
      if (q) { const x0 = e.x + h.x * r, y0 = e.y + h.y * r, m = hyp(at.x - x0, at.y - y0) || 1; q.on = true; q.x = x0; q.y = y0; q.vx = (at.x - x0) / m * S.speed; q.vy = (at.y - y0) / m * S.speed; q.left = S.life; q.spin = 0; q.dmg = dmg(e, "pachySkullLaunch"); q.prey = d.prey || null; K.cue(w, e, "fling", "pachySkullLaunch"); } }
    if (d.n >= S.count && d.next <= 0 || s.t <= 0) { e.pachyPose = null; K.toPhase(s, "recover", A_("pachySkullLaunch").recover); }
  },
  pachyAmbush(e, s, w) {
    const A = PACHY.ambush;
    if (s.phase === "windup") { if (s.t <= 0) { s.tele = null; e.pachyPose = "burst"; strike(e, s, w, "pachyAmbush", e.x, e.y, K.bodyRadius(e) + A.radius * .6); wave(e, w, e.x, e.y, A.ring, dmg(e, "pachyAmbush", A.ringShare), null, youHit); K.cue(w, e, "roar", "pachyAmbush"); w.shake?.(.4, .4); K.toPhase(s, "active", A_("pachyAmbush").active); } return; }
    if (s.phase === "active" && s.t <= 0) K.toPhase(s, "recover", A_("pachyAmbush").recover);
    if (s.phase === "recover" && s.t <= 0) e.pachyPose = null;
  },
};
// Head-butts (or the clash's shoves): `n` blows `every` s apart, stepping in after the quarry, each in the arc ahead; `push` shoves a
// duel foe back.
function butts(e, s, w, id, count, every, pose, push) {
  const B = PACHY.butt, d = s.data;
  if (s.phase === "windup") { const q = quarry(w, s); face(e, q.x - e.x, q.y - e.y); if (s.t <= 0) { d.n = 0; d.next = 0; K.toPhase(s, "active", A_(id).active); } return; }
  if (s.phase === "recover") { if (s.t <= 0) e.pachyPose = null; return; }
  d.next -= w.dt; e.pachyPose = d.next > every * .45 ? pose : "chargeReady";
  if (d.n < count && d.next <= 0) {
    const q = quarry(w, s), m = hyp(q.x - e.x, q.y - e.y) || 1; face(e, q.x - e.x, q.y - e.y); const h = pachyHeading(e);
    if (m > K.bodyRadius(e) + 1) w.move(e, h.x * B.step, h.y * B.step);
    const reach = K.bodyRadius(e) + B.reach, cx = e.x + h.x * reach * .55, cy = e.y + h.y * reach * .55;
    if (strike(e, s, w, id, cx, cy, reach * .6) && push) { const foe = preyOf(w, s); if (foe) w.move(foe, h.x * push, h.y * push); }
    d.n++; d.next = every; e.pachyPose = pose; K.cue(w, e, "hit", id, e);
  }
  if (d.n >= count && d.next <= 0 || s.t <= 0) { e.pachyPose = null; K.toPhase(s, "recover", A_(id).recover); }
}

// ---------------------------------------------------------------- readiness
export function pachyCan(e, s, w, id) {
  const A = PACHY_ATTACKS[id]; if (!A) return true;
  if (id === "pachyAmbush") return false; // only the disguise starts it
  if (e.pachyDisguised || s?.pachyShifting > 0) return false;
  if (PACHY.fossilOnly.includes(id) && e.pachyForm !== "fossil") return false;
  if (PACHY.fleshOnly.includes(id) && e.pachyForm === "fossil") return false;
  if (A.duel && !preyOf(w, s) && !s?.pachyRival) return false;
  const live = (k) => pachyLive(e, k), C = PACHY.caps;
  if (id === "pachyRockLaunch") return live("rocks") + PACHY.rocks.count <= C.rocks;
  if (id === "pachySkullLaunch") return live("skulls") + PACHY.skulls.count <= C.skulls;
  if (id === "pachyBoneSpikes") return live("bones") + PACHY.bones.count <= C.bones;
  return true;
}

// ---------------------------------------------------------------- the duel, and its hunger
const rivalOk = (q, e) => !!q && q !== e && !q.dead && PACHY.duel.kinds.includes(q.kind) && K.duelPair(e, q) && !q.retreating && !q.passingBeast && !q.fleeTo && !q.untargetable && !q.hidden && !q.illusion && !q.mountView && !q.mount && !q.dinoFled
  && (q.kind !== "triceratops" || q.triceratopsDisposition === "bad" || q.triceratopsBetrayed === true); // a wild Triceratops only when hostile (never a herd's friendly ones, never a ridden one)
export function rivalNear(e, w) { let best = null, bd = PACHY.duel.sight; for (const q of w.enemies || []) { if (!rivalOk(q, e)) continue; const dd = hyp(q.x - e.x, q.y - e.y); if (dd < bd) { bd = dd; best = q; } } return best; }
function preyNear(e, w) { let best = null, bd = PACHY.hunt.range + K.bodyRadius(e); for (const q of w.enemies || []) { if (!K.prey(q, e) || q.kind === PACHY_KIND || PACHY.duel.kinds.includes(q.kind)) continue; const dd = hyp(q.x - e.x, q.y - e.y); if (dd < bd) { bd = dd; best = q; } } return best; }
function focusOf(e, s, w, d) {
  const R = PACHY.duel, H = PACHY.hunt;
  s.pachyRefocus = (s.pachyRefocus ?? 0) - w.dt;
  if (s.pachyRefocus <= 0) {
    s.pachyFocusN = (s.pachyFocusN || 0) + 1; const rival = rivalNear(e, w), roll = hashSeed(`${e.id}:pachy-focus:${s.pachyFocusN}`) % 100;
    if (rival) { const you = !K.duelWinner(e) && d <= R.close + K.bodyRadius(e) && roll < R.youChance; s.pachyRival = you ? null : rival.id; s.pachyPrey = null; s.pachyRefocus = you ? R.refocusYou : R.refocus; }
    else { const q = preyNear(e, w), go = !!q && (roll < H.chance || hyp(q.x - e.x, q.y - e.y) < d); s.pachyRival = null; s.pachyPrey = go ? q.id : null; s.pachyRefocus = go ? H.refocus : H.refocusYou; }
  }
  const id = s.pachyRival || s.pachyPrey; if (!id) return null;
  for (const q of w.enemies || []) if (q.id === id && !q.dead && (s.pachyRival ? rivalOk(q, e) : K.prey(q, e))) return q;
  s.pachyRival = null; s.pachyPrey = null; return null;
}
function focusStep(e, s, w, foe) {
  const R = PACHY.duel, rival = !!s.pachyRival, fd = hyp(foe.x - e.x, foe.y - e.y), reach = rival ? K.duelReach : 0;
  if (s.gap <= 0 && !(rival && R.wait && K.blowComing(foe, e))) {
    const list = rival ? R.moves[foe.kind] || R.moves.spinoRex : ["pachyDomeRam", "pachyHeadSlam", "pachyCharge"];
    let pick = null, n = 0;
    for (const id of list) { const A = PACHY_ATTACKS[id]; if (!(e.packAttacks || []).includes(id) && !A.duel || (s.cd[id] || 0) > 0 || fd < A.range[0] || fd > A.range[1] + K.bodyRadius(e) + reach + (rival ? 0 : K.bodyRadius(foe))) continue; if (!pachyCan(e, s, w, id)) continue; n++; if (hashSeed(`${e.id}:pachy-pick:${s.seq}:${id}`) % n === 0) pick = id; }
    if (pick) { s.state = "attack"; s.last = pick; K.beginAttack(e, s, pick, w, foe); return true; }
  }
  const want = K.bodyRadius(e) + K.bodyRadius(foe) + (rival ? R.gap + K.duelGap : .4), step = .82 * R.speed * (e.speedMultiplier || 1) * w.dt, dx = foe.x - e.x, dy = foe.y - e.y, m = fd || 1;
  if (fd > want) w.move(e, dx / m * step, dy / m * step); else if (rival && fd < want - K.duelSlack) w.move(e, -dx / m * step, -dy / m * step);
  return true;
}

// ---------------------------------------------------------------- every fighting frame, before the shared brain
export function pachyTick(e, s, w, p, d) {
  if (K.feeds(e, s, w)) { e.pachyPose = e.dinoFeed > 0 ? "feed" : null; return e.dinoFeed > 0; }
  if (s.attack || s.broken > 0 || e.hitStun > 0 || s.evade) return false;
  if (e.pachyPose === "feed" || e.pachyPose === "land" || e.pachyPose === "bonk") e.pachyPose = null;
  const foe = focusOf(e, s, w, d), at = foe || p;
  turnToward(e, at.x, at.y, PACHY.turn, w.dt);
  if (foe) return focusStep(e, s, w, foe);
  return false;
}
// Let go of everything on a reload or its death (it holds nothing; its shots fly on until they land, then stop).
export function pachyLetGo(e) { e.pachyAir = 0; e.aloft = false; }

// ---------------------------------------------------------------- big rooms and the overworld ambush
// The spawn a floor holds, or null. `kind`: "building" or "pentagon"; `taken`: another big beast already holds its big room.
export function pachyRoomSpawn(seed, id, map, kind, V = PACHY_ROOMS.version, taken = false) {
  if (!(V >= 1) || taken || !stegoRoomGround(kind, map)) return null;
  if ((hashSeed(`${seed}:pachy-room:v${V}:${id}`) % 1000) / 1000 >= PACHY_ROOMS.chance) return null;
  const sq = stegoRoomSquare(map); if (!sq || sq.side < PACHY_ROOMS.side) return null;
  const hid = (hashSeed(`${seed}:pachy-room-rock:v${V}:${id}`) % 1000) / 1000 < PACHY_ROOMS.disguised;
  return { id: `${id}:pachy`, kind: PACHY_KIND, x: sq.x, y: sq.y, boss: false, pachyRoom: true, ...(hid ? { pachyDisguised: true } : {}) };
}
// The ambush a section first seen at version `V` holds, or null: lying as a rock on open ground (`open(x, y)`) away from the edges.
export function pachyAmbushSpawn(seed, rx, ry, V, open, size = 32) {
  const A = PACHY_AMBUSH; if (!(V >= 1)) return null;
  if (Math.abs(rx) + Math.abs(ry) < A.minDepth) return null;
  const key = `${seed}:pachy-ambush:v${V}:${rx}:${ry}`; if (hashSeed(key) % 1000 >= A.perThousand) return null;
  for (let i = 0; i < A.tries; i++) { const h = hashSeed(`${key}:spot:${i}`), span = size - A.fromEdge * 2, x = A.fromEdge + (h % span), y = A.fromEdge + ((h >>> 9) % span); if (open(x, y)) return { id: `${key}:pachy`, kind: PACHY_KIND, x, y, boss: false, pachyAmbush: true, pachyDisguised: true }; }
  return null;
}
// save.pachy (additive at schema 14, normalised in freshSave and migrateSave): { v: 1, slain: [spawn ids] } — the Pachycephalosauruses
// that have fallen, so none is laid again however its ground is reloaded (each pays once). At most `keep`, the newest last.
export const PACHY_SAVE = { keep: 400 };
export function ensurePachyState(save) {
  if (!save || typeof save !== "object") return null;
  const raw = save.pachy && typeof save.pachy === "object" && !Array.isArray(save.pachy) ? save.pachy : {};
  const slain = Array.isArray(raw.slain) ? [...new Set(raw.slain.filter((q) => typeof q === "string" && q && q.length <= 240))].slice(-PACHY_SAVE.keep) : [];
  save.pachy = { ...raw, v: 1, slain };
  return save.pachy;
}
export function notePachySlain(save, id) { const S = ensurePachyState(save); if (!S || typeof id !== "string" || !id || S.slain.includes(id)) return false; S.slain.push(id); if (S.slain.length > PACHY_SAVE.keep) S.slain.splice(0, S.slain.length - PACHY_SAVE.keep); return true; }
export const pachySlain = (save, id) => Array.isArray(save?.pachy?.slain) && save.pachy.slain.includes(id);
