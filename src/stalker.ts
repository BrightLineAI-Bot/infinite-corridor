// Release 678: the Stalker (Tim, 2026-11-01: "the world is too peaceful"). A silver creature of the Corridor that hunts the
// Wayfarer on the overworld only, one at a time.
//
// - The hunt (`STALKER.hunt`): while it hunts, every tile of ground the Wayfarer covers on the overworld (walking, dodging, the
//   drone's booster; never a fast-travel jump, which `step` drops) brings it closer, across sections, so it cannot be outrun for
//   good. At `need` tiles it ambushes. As it closes a warning grows (`warn` fractions: "Something is following you" … "The
//   Stalker is close") and a pulsing silver marker at the screen edge points its way.
// - Where it never goes: dungeons, buildings, shelters and towns. Inside a dungeon it waits by the door the Wayfarer went in and
//   is there when they come out (`active.door`); a shelter or a town it watches from the last open ground the Wayfarer stood on.
//   Lost any other way (a section edge, a Wayglass) it hangs back and comes again after `follow` more tiles.
// - Once killed it hunts again only after `reset` (30–40) new sections are explored (`quiet`, saved, additive at schema 14).
// - The fight (`updateStalker`): three forms. The cat (a six-legged white snow leopard) pounces, swipes and springs back; the ape
//   (a white silverback with bat wings) leaps and flies up to high ground, then a fist and a leap back; the pool (a silver
//   puddle) slides to a new side and cannot be hit. It is never staggered. Some blows land on an afterimage while it reappears
//   elsewhere, leaving decoys that attack and fade (`afterimage`: charges, a gap and a recharge, so it must come out and fight).
//   At `swarm.at` health it calls small silver copies of itself (capped). It carries 1–2 elite affixes and scales with
//   regionalThreat.
// Runtime fields on the creatures (`stalkForm`, `stalkAct`, …) are never saved; only `save.stalker` is.
import { hashSeed } from "./random.ts";

export const STALKER = {
  version: 1,
  unlockTier: 3, // Resonant, as the roaming Gate Revenant
  hunt: { need: [300, 440], warn: [.5, .75, .9], follow: 70, step: 1.5, spawn: [7, 10] },
  reset: [30, 40],
  vitals: { hpShare: 1, damageShare: .22, damageScale: .85 },
  size: 1.4,
  forms: {
    cat: { speed: 3.3, range: 5, pounce: { warn: .45, time: .32, reach: 1.15, damage: 1 }, swipe: { warn: .3, reach: 1.5, damage: .8 }, spring: { distance: 3.4, time: .3 } },
    ape: { speed: 2.2, range: 6.5, fly: 9, stuck: .7, leap: { warn: .55, time: .6, radius: 1.4, lift: 2.2, damage: 1.1 }, fist: { warn: .35, reach: 1.55, damage: .9 }, spring: { distance: 3, time: .4 } },
    pool: { speed: 5.2, time: 1.6, rise: .35, flank: [3, 4.5] },
  },
  prowl: [.7, 1.5],
  afterimage: { charges: 3, gap: 3.5, recharge: 14, chance: .45, decoys: [1, 2], away: [3, 4.5] },
  decoy: { life: 5, hp: 1, damage: .35, speed: 3.6, scale: .9 },
  swarm: { at: [.7, .4], count: 3, cap: 5, hp: .05, damage: .22, speed: 3.1, scale: .55, life: 30 },
  kin: { reach: 1, warn: .3, back: .45 },
  affixes: [1, 2],
  reward: { marks: 40, perLevel: 1, drops: 3 },
  // The second kit (Tim, 2026-11-01): a turret that pops out of its back (homing orbs, a laser cone, a ring of orbs that launch
  // one by one, the crossed-blade X beam), an energized sphere (it hurts to touch, softens blows, and is thrown at the end), a
  // liquid shield when blows come thick and fast, and the cat climbing trees, hopping ledges and breaking out of enclosures.
  turret: { every: [3.2, 4.6], warn: .6, cap: 18, moves: ["orbs", "sword", "cone", "spikes", "ring", "tendril", "xblade", "boomerang"],
    orbs: { count: 3, speed: 4.2, turn: 2.4, life: 3.2, radius: .3, damage: .45, spread: .45 },
    cone: { range: 6.5, half: .42, damage: .9 },
    ring: { count: 4, orbit: 1.3, spin: 3, gap: .5, speed: 6.5, life: 2.4, radius: .3, damage: .4 },
    // Two great liquid blades rise from its back, swing and cross in an X in front of it (`reach` tiles out, each blade `length`
    // tiles: longer than its body), then a larger X flies straight at where the Wayfarer stood (no homing).
    xblade: { rise: .5, swing: .3, hold: .15, reach: 1.7, length: 2.3, cross: 1.25, damage: 1, speed: 6.5, life: 2.6, radius: 1.5, shot: 1.1 } },
  // The appendage (Tim, 2026-11-01): a shapeshifting limb out of its back. A sword sweep; three spikes thrust forward that fire
  // three blasts bouncing off blocks; a tendril into the ground and eruptions that follow the Wayfarer; the limb thrown as a
  // spinning blade that comes back like a boomerang.
  limb: {
    sword: { reach: 2.9, arc: 1.15, time: .3, damage: .9 },
    spikes: { length: 3, spread: .3, width: .5, time: .35, damage: .7, blast: { speed: 7, life: 2.2, radius: .3, damage: .45, bounces: 2 } },
    tendril: { count: 5, every: .45, arm: .55, radius: 1.25, burst: .3, damage: .8, cap: 6 },
    boomerang: { speed: 10, out: .6, life: 2.6, radius: .55, damage: .7 },
  },
  // The gorilla's arms (Tim, 2026-11-01): launched fists that grab and pull, slam from above, sweep back and forth, both arms
  // sweeping round it; a charge that knocks back (off a tree, even); punches and a kick like the Iron Fist. `pick` is the order.
  arms: {
    pick: ["leap", "grab", "combo", "slam", "lasers", "charge", "sweep", "spin"],
    // Lasers (Tim, 2026-11-01): long laser bolts out along its arms as they sweep in the spin (one arm or both, by turns: `armLasers`),
    // every `step` radians of the sweep; or a fan of them without the sweep (`lasers`). Each bolt flies straight on.
    laser: { step: Math.PI / 6, speed: 14, len: 2.4, life: 1.1, width: .3, damage: .45 },
    lasers: { range: 7, warn: .5, fan: [-75, -45, -15, 15, 45, 75], gap: .07 },
    armLasers: [0, 1, 2],
    grab: { range: 6.5, warn: .45, speed: 13, reach: 6.5, catch: .75, pull: .45, damage: .6 },
    slam: { range: 7, warn: .75, radius: 1.3, lift: 2.4, fall: .14, damage: 1.1 },
    sweep: { range: 4.2, warn: .45, time: .9, reach: 4.2, arc: 1.1, width: .55, damage: .7 },
    spin: { range: 3.6, warn: .55, time: .7, reach: 3.6, width: .55, damage: .8 },
    charge: { range: 7.5, warn: .5, speed: 9, time: .75, touch: 1.05, knock: 2.6, damage: 1 },
    combo: { range: 1.6, warn: .22, reach: 1.45, kick: 1.8, knock: 1.4, damage: [.55, .6, .8] },
    retract: .3,
  },
  // Lying in wait (Tim, 2026-11-01: "you might not see it... it hops out of the shadows... goes from transparent to opaque... a jump
  // scare... or it could be sitting in a tree, just waiting"): it comes out ahead of the Wayfarer, on the highest open ground it
  // finds, all but invisible and still; it springs when they come within `trigger` (or hit it, or after `max` s), fading in over
  // `reveal` s with a quick pounce or leap. Left far behind (`lose`), it creeps after them unseen.
  lurk: { trigger: 3.4, reveal: .35, spring: .22, max: 40, lose: 13, creep: 1.4, alpha: .045 },
  // The fog (Tim, 2026-11-01: "it could be coming toward you, and then it can go invisible and attack... when it gets close enough
  // it makes the fog, and then it goes invisible and strikes... the penumbra should be slightly blue"): on alternate hunts it comes
  // in the open; within `range` it fills the section with fog (`time` s) and veils itself, all but invisible (a faint blue glow,
  // its marks still shown) while it fights on. In the fight it veils again every `again` s for `again_time` s.
  fog: { range: 6, time: 12, again: [24, 34], againTime: 7, alpha: .06 },
  // The mirage (Tim, 2026-11-01): now and then it goes all but invisible for `time` s and fights by darting: it circles fast at
  // `orbit` tiles, cuts in at `dash` speed for one or two blows (`strikes`; the cat slashes, the gorilla punches), and springs out
  // again; the afterimage still turns blows. Some mirages bring the fog (`fogChance`); in one it may slip away to `hide.dist` and
  // heal (`hide.regen` of its health a second, at most `hide.cap` a mirage), glowing red while it does.
  mirage: { every: [20, 30], time: 11, alpha: .06, speed: 6, orbit: 4, dash: 10, reach: 1.3, strikes: [1, 2], gap: .2, damage: .5, out: { dist: 3.4, time: .24 }, rest: [.5, 1.1], reachTime: 1.3, fogChance: .5, hideChance: .35, hide: { time: 5, dist: 8, regen: .03, cap: .15 } },
  // How it comes for you, by turns (Tim: "it doesn't always have to be lying in wait... running at you from across the section...
  // slowly stalking towards you and then start running... flying in if it's in the gorilla form... or lying in wait invisible").
  approach: { styles: ["lurk", "run", "fog", "creep", "fly"], far: [10, 13], creepSpeed: .35, creepUntil: 6, flyTime: 1.1 },
  // The cat's new moves: a flurry of forward swipes (like the Questing Beast's), and the tide: it melts into a wave and washes at
  // the Wayfarer, three waves each bigger than the last.
  cat: {
    pick: ["pounce", "flurry", "pounce", "tide"],
    flurry: { range: 2.6, warn: .35, strikes: 5, every: .17, lunge: .35, reach: 1.35, damage: .45 },
    tide: { range: 7, warn: .55, widths: [1.6, 2.4, 3.4], gap: .4, speed: 6.5, length: 7.5, depth: .55, damage: [.6, .75, .9] },
  },
  // The puddle's moves: it slides under the Wayfarer and a mouth of silver blades rises from the floor and bites; or it splits into
  // six little puddles that roam the floor biting, and go on doing so for a while after it has risen again.
  pool: {
    under: { speed: 7, time: 1, warn: .6, bite: .2, radius: 1.1, damage: 1.2 },
    split: { count: 6, cap: 6, time: .35, life: 9, speed: 2.6, reach: 1.1, warn: .5, radius: .7, damage: .35, gap: [1.2, 2] },
  },
  // The mist (Tim, 2026-11-01): it turns to mist, surrounds the Wayfarer and rushes through them; each pass that touches them rots
  // a tenth of their maximum health away until they rest (rot past their whole health kills).
  mist: { every: 5, gather: .55, ring: 1, radius: 2.6, spin: 4.2, passes: 3, pass: .38, between: .3, touch: .8, rot: .1 },
  energized: { every: [14, 20], time: 6, aura: 1.15, tick: .8, damage: .35, reduce: .5, sphere: { speed: 4.6, life: 3, radius: .8, damage: 1.1 } },
  shield: { burst: .12, window: 2, time: 3, cooldown: 14, reduce: .75, speed: 2.4 },
  climb: { stuck: .5, hop: 3.4, hopTime: .45, hopLift: 1.1, speed: 2.6, time: 4 },
  texts: ["Something is following you.", "Something silver keeps pace behind you.", "The Stalker is close."],
};

const roll = (key, [lo, hi]) => lo + (hashSeed(key) % 1000) / 1000 * (hi - lo);
const between = (key, [lo, hi]) => lo + hashSeed(key) % (hi - lo + 1);

// The saved hunt. `ground` tiles covered toward `need`; `quiet` new sections left before it hunts again (null while it hunts);
// `active` the Stalker met and not yet killed (its health, and `door` while it waits outside a dungeon).
export function ensureStalker(save) {
  const q = save.stalker && typeof save.stalker === "object" ? save.stalker : (save.stalker = {});
  q.v = 1; q.ground = Math.max(0, Number(q.ground) || 0); q.kills = Math.max(0, Math.floor(Number(q.kills) || 0)); q.seq = Math.max(0, Math.floor(Number(q.seq) || 0));
  q.warned = Math.max(0, Math.min(3, Math.floor(Number(q.warned) || 0)));
  q.quiet = Number.isFinite(q.quiet) && q.quiet > 0 ? Math.floor(q.quiet) : null;
  if (!Number.isFinite(q.need) || q.need <= 0) q.need = Math.round(roll(`${save.seed}:stalker:need:${q.seq}`, STALKER.hunt.need));
  if (q.active && typeof q.active === "object") {
    const a = q.active; a.engaged = !!a.engaged;
    if (!(Number(a.hp) > 0)) a.hp = null;
    if (a.door && !(Number.isInteger(a.door.rx) && Number.isInteger(a.door.ry) && Number.isFinite(a.door.x) && Number.isFinite(a.door.y))) a.door = null;
  } else q.active = null;
  return q;
}
export const stalkerUnlocked = (save, tier) => Number(tier) >= STALKER.unlockTier;
export const stalkerHunting = (save) => ensureStalker(save).quiet == null;
// The warning stage for a fraction of the way (0: none … 3: close).
export function warnStage(fraction) { let n = 0; for (const w of STALKER.hunt.warn) if (fraction >= w) n++; return n; }

// One frame of ground covered on the overworld. Returns { ready, warn } (warn: a message the first time a stage is passed).
export function stalkerTrack(save, moved, unlocked = true) {
  const q = ensureStalker(save);
  if (!unlocked || q.quiet != null) return { ready: false, warn: null };
  const step = Number(moved) > 0 && Number(moved) <= STALKER.hunt.step ? Number(moved) : 0;
  q.ground = Math.min(q.need, q.ground + step);
  const stage = warnStage(q.ground / q.need); let warn = null;
  if (stage > q.warned) { q.warned = stage; warn = STALKER.texts[stage - 1]; }
  return { ready: q.ground >= q.need, warn };
}
// How close it is (0–1) and the warning shown, or null while it rests.
export function stalkerWarning(save) {
  const q = ensureStalker(save); if (q.quiet != null) return null;
  const f = Math.min(1, q.ground / q.need), stage = warnStage(f);
  return stage ? { fraction: f, stage, text: STALKER.texts[stage - 1] } : null;
}
// A new section explored: the count toward its return after a kill.
export function stalkerNewSection(save) {
  const q = ensureStalker(save); if (q.quiet == null) return false;
  q.quiet -= 1; if (q.quiet > 0) return false;
  q.quiet = null; q.ground = 0; q.warned = 0; q.seq += 1; q.need = Math.round(roll(`${save.seed}:stalker:need:${q.seq}`, STALKER.hunt.need));
  return true;
}
// It came out to fight.
export function stalkerEngaged(save, hp) { const q = ensureStalker(save); q.active = { ...(q.active || {}), engaged: true, hp: Number(hp) > 0 ? hp : null, door: null }; return q.active; }
// The fight left the section (an edge, a Wayglass, a reload): it hangs back and comes again after `follow` more tiles.
export function stalkerLost(save) {
  const q = ensureStalker(save); if (!q.active) return;
  q.active.engaged = false; q.active.door = null; q.ground = Math.min(q.ground, Math.max(0, q.need - STALKER.hunt.follow)); q.warned = warnStage(q.ground / q.need);
}
// The Wayfarer went into a dungeon while it fought: it waits by that door.
export function stalkerWaitAtDoor(save, door) {
  const q = ensureStalker(save); if (!q.active?.engaged || q.active.door || !door) return false;
  q.active.door = { rx: door.rx, ry: door.ry, x: door.x, y: door.y }; return true;
}
// The door it waits by, if the Wayfarer has come out in that section.
export function stalkerDoorHere(save, rx, ry) { const d = ensureStalker(save).active?.door; return d && d.rx === rx && d.ry === ry ? d : null; }
// The Wayfarer fell: it lets them go and begins again.
export function stalkerPlayerFell(save) { const q = ensureStalker(save); q.active = null; q.ground = 0; q.warned = 0; }
// Killed: it hunts again after 30–40 new sections.
export function stalkerSlain(save) {
  const q = ensureStalker(save); q.kills += 1; q.active = null; q.ground = 0; q.warned = 0;
  q.quiet = between(`${save.seed}:stalker:reset:${q.kills}`, STALKER.reset);
  const marks = STALKER.reward.marks + STALKER.reward.perLevel * (Number(save.level) || 1);
  save.currency = (Number(save.currency) || 0) + marks;
  const sphere = q.kills % 2 ? "weaponSphere" : "armorSphere"; save.materials ||= {}; save.materials[sphere] = (save.materials[sphere] || 0) + 1;
  return { marks, sphere, quiet: q.quiet };
}
// Its health and damage: about a Gate Revenant's health, a little under a world beast's damage, both scaled by regional threat.
// `revenantHp` is a tuned Gate Revenant's maxHp; `beastDamage` the world-beast damage for STALKER.vitals.damageShare.
export function stalkerVitals(revenantHp, beastDamage, threat = { hpMultiplier: 1, damageMultiplier: 1 }) {
  const V = STALKER.vitals, hp = Math.max(1, Math.round(revenantHp * V.hpShare * (threat.hpMultiplier || 1)));
  return { hp, damage: Math.max(1, Math.round(beastDamage * V.damageScale * (threat.damageMultiplier || 1))) };
}
// Where the ambush comes from: behind the Wayfarer (against the way they are going), `spawn` tiles out.
export function ambushSpots(seed, seq, player, heading, range = STALKER.hunt.spawn) {
  const back = Math.atan2(-(heading?.y || 1), -(heading?.x || 0)), out = [];
  for (let i = 0; i < 12; i++) { const a = back + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .45, r = roll(`${seed}:stalker:spot:${seq}:${i}`, range); out.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r }); }
  return out;
}

// ---- The fight ----
const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }
const chance = (key) => (hashSeed(key) % 1000) / 1000;

function setAct(e, kind, t, extra = {}) { e.stalkAct = { kind, t, total: t, ...extra }; }
// Walk (or slide) toward a point; true when it moved.
function step(e, w, to, speed, dt) {
  const v = unit(to.x - e.x, to.y - e.y), d = dist(e, to), s = Math.min(d, speed * (e.speedMultiplier || 1) * dt);
  if (d < .05) return false; e.facingX = v.x >= 0 ? 1 : -1;
  return w.move(e, v.x * s, v.y * s);
}
// The first open landing near `to`, from `to` outward.
function landing(w, to, from) {
  if (w.open(to.x, to.y)) return { x: to.x, y: to.y };
  for (let r = .6; r <= 2.4; r += .6) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = { x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r }; if (w.open(q.x, q.y)) return q; }
  return from ? { x: from.x, y: from.y } : null;
}
// What it turns into next: the ape when the cat cannot reach (or the Wayfarer stands high above it), now and then the pool to
// come at them from another side, otherwise the cat or the ape.
export function nextForm(e, w) {
  const n = (e.stalkCycle = (e.stalkCycle || 0) + 1), high = w.elev ? Math.abs((w.elev(w.player.x, w.player.y) || 0) - (w.elev(e.x, e.y) || 0)) >= 2 : false;
  if (high || (e.stalkStuck || 0) >= STALKER.forms.ape.stuck) return "ape";
  if (n % STALKER.mist.every === STALKER.mist.every - 1 && e.stalkForm !== "mist") return "mist";
  if (n % 2 === 0 && e.stalkForm !== "pool") return "pool";
  return hashSeed(`${e.id}:form:${n}`) % 2 ? "ape" : "cat";
}
function beginForm(e, w, form) {
  e.stalkForm = form; e.stalkStuck = 0; e.untargetable = form === "pool" || form === "mist"; e.stalkLift = 0;
  if (form === "mist") { setAct(e, "mistGather", STALKER.mist.gather); return; }
  if (form === "pool") {
    const p = w.player, side = hashSeed(`${e.id}:flank:${e.stalkCycle}`) % 2 ? 1 : -1, base = Math.atan2(e.y - p.y, e.x - p.x) + side * Math.PI / 2;
    let to = null; for (let i = 0; i < 6 && !to; i++) { const a = base + side * i * .5, r = roll(`${e.id}:flankr:${e.stalkCycle}:${i}`, STALKER.forms.pool.flank), q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; if (w.open(q.x, q.y)) to = q; }
    setAct(e, "slide", STALKER.forms.pool.time, { to: to || { x: e.x, y: e.y } });
  } else setAct(e, "prowl", roll(`${e.id}:prowl:${e.stalkCycle}`, STALKER.prowl));
}
function hit(e, w, reach, share, at = e) {
  if (dist(at, w.player) > reach + (e.stalkerKin ? 0 : .2)) return false;
  return w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * share)));
}

// The small silver copies and the decoys: run in, swipe once (copies keep at it), and the decoys fade.
function updateKin(e, w, dt) {
  const K = STALKER.kin, p = w.player;
  if (e.stalkerDecoy || e.stalkLife != null) { e.stalkLife = (e.stalkLife ?? (e.stalkerDecoy ? STALKER.decoy.life : STALKER.swarm.life)) - dt; if (e.stalkLife <= 0 || !w.ownerAlive?.(e)) { e.dead = true; e.noRewards = true; return; } }
  const a = e.stalkAct || setAct(e, "run", 0) || e.stalkAct; a.t -= dt;
  if (a.kind === "run") { if (dist(e, p) <= K.reach) setAct(e, "swipeWarn", K.warn); else step(e, w, p, e.stalkerDecoy ? STALKER.decoy.speed : STALKER.swarm.speed, dt); }
  else if (a.kind === "swipeWarn") { e.telegraph = Math.max(0, a.t); if (a.t <= 0) { e.telegraph = 0; hit(e, w, K.reach + .3, 1); if (e.stalkerDecoy) { e.stalkLife = Math.min(e.stalkLife, .5); } setAct(e, "back", K.back); } }
  else if (a.kind === "back") { const v = unit(e.x - p.x, e.y - p.y); w.move(e, v.x * 3 * dt, v.y * 3 * dt); if (a.t <= 0) setAct(e, "run", 0); }
}

// The afterimage: a blow that would land falls on an afterimage, the Stalker reappears `away` tiles off and leaves decoys.
// Returns true when the blow was turned.
export function stalkerAfterimage(e, w) {
  const A = STALKER.afterimage, last = e.stalkLastHp;
  if (!(Number.isFinite(last) && e.hp < last && e.hp > 0) || e.untargetable) return false;
  e.stalkBlows = (e.stalkBlows || 0) + 1;
  if (!(e.stalkCharges > 0) || (e.stalkDodgeGap || 0) > 0 || chance(`${e.id}:afterimage:${e.stalkBlows}`) >= A.chance) return false;
  e.hp = last; e.stalkCharges -= 1; e.stalkDodgeGap = A.gap; e.hitFlash = 0;
  (e.stalkGhosts ||= []).push({ x: e.x, y: e.y, form: e.stalkForm, t: .6 }); if (e.stalkGhosts.length > 4) e.stalkGhosts.shift();
  const p = w.player, base = Math.atan2(e.y - p.y, e.x - p.x);
  for (let i = 0; i < 8; i++) { const a = base + (i % 2 ? 1 : -1) * (1 + i) * .4, r = roll(`${e.id}:away:${e.stalkBlows}:${i}`, A.away), q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }; if (w.open(q.x, q.y)) { e.x = q.x; e.y = q.y; break; } }
  const n = between(`${e.id}:decoys:${e.stalkBlows}`, A.decoys), from = e.stalkGhosts[e.stalkGhosts.length - 1];
  w.decoys?.(e, n, from); setAct(e, "prowl", .5); return true;
}

// Blows soften: half while energized, three quarters behind the liquid shield, which rises when blows come thick and fast.
export function stalkerSoften(e, before, dt) {
  const H = STALKER.shield, E = STALKER.energized;
  e.stalkShield = Math.max(0, (e.stalkShield || 0) - dt); e.stalkShieldCd = Math.max(0, (e.stalkShieldCd || 0) - dt);
  let lost = Number.isFinite(before) && e.hp > 0 ? Math.max(0, before - e.hp) : 0;
  const reduce = Math.max(e.stalkShield > 0 ? H.reduce : 0, (e.stalkCharged || 0) > 0 ? E.reduce : 0);
  if (lost > 0 && reduce > 0) { const back = lost * reduce; e.hp = Math.min(e.maxHp, e.hp + back); lost -= back; }
  e.stalkRecent = (e.stalkRecent || 0) * Math.exp(-dt / H.window) + lost;
  if (e.stalkShield <= 0 && e.stalkShieldCd <= 0 && e.stalkRecent >= e.maxHp * H.burst && e.stalkForm !== "pool" && e.stalkForm !== "mist") { e.stalkShield = H.time; e.stalkShieldCd = H.cooldown; e.stalkRecent = 0; }
}
// Its own shots (bounded): homing orbs, the ring's orbs, the X beam and the thrown sphere.
function shoot(e, shot) { const list = (e.stalkShots ||= []); if (list.length < STALKER.turret.cap) list.push(shot); }
function tickShots(e, w, dt) {
  const p = w.player, R = STALKER.turret.ring; if (!e.stalkShots?.length) return;
  for (const q of e.stalkShots) {
    q.life -= dt;
    if (q.orbit) {
      q.a += R.spin * dt; q.delay -= dt; q.x = e.x + Math.cos(q.a) * R.orbit; q.y = e.y - .3 + Math.sin(q.a) * R.orbit * .6;
      if (q.delay > 0) { q.life = Math.max(q.life, .2); continue; }
      const v = unit(p.x - q.x, p.y - q.y); q.vx = v.x * R.speed; q.vy = v.y * R.speed; q.orbit = false; q.life = R.life;
    }
    if (q.home) { const want = Math.atan2(p.y - q.y, p.x - q.x), have = Math.atan2(q.vy, q.vx), turn = Math.max(-q.home * dt, Math.min(q.home * dt, Math.atan2(Math.sin(want - have), Math.cos(want - have)))), sp = Math.hypot(q.vx, q.vy); q.vx = Math.cos(have + turn) * sp; q.vy = Math.sin(have + turn) * sp; }
    if (q.kind === "boomer") { q.age += dt; if (q.age > q.out) { const v = unit(e.x - q.x, e.y - .4 - q.y), sp = Math.hypot(q.vx, q.vy); q.vx = v.x * sp; q.vy = v.y * sp; if (Math.hypot(e.x - q.x, e.y - .4 - q.y) < .7) { q.life = 0; continue; } } }
    const ox = q.x, oy = q.y; q.x += q.vx * dt; q.y += q.vy * dt; q.spin = (q.spin || 0) + dt * (q.kind === "boomer" ? 18 : 9);
    if (!q.ghost && w.shotBlocked?.(q.x + .5, q.y + .5)) {
      // A blast bounces off blocks (flipping whichever way it struck); anything else stops.
      if ((q.bounces || 0) > 0) { q.bounces--; if (w.shotBlocked(q.x + .5, oy + .5)) q.vx = -q.vx; if (w.shotBlocked(ox + .5, q.y + .5)) q.vy = -q.vy; if (!w.shotBlocked(q.x + .5, oy + .5) && !w.shotBlocked(ox + .5, q.y + .5)) { q.vx = -q.vx; q.vy = -q.vy; } q.x = ox; q.y = oy; continue; }
      q.life = 0; continue;
    }
    if (q.kind === "laser") { const tail = { x: q.x - Math.cos(q.aim) * q.len, y: q.y - Math.sin(q.aim) * q.len }; if (segDist(p, tail, q) < q.radius + .3) { w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * q.damage))); q.life = 0; } continue; }
    if (q.kind === "boomer") { const leg = q.age > q.out ? 1 : 0; if (!(q.hit || [])[leg] && Math.hypot(p.x - q.x, p.y - q.y) < q.radius + .3 && w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * q.damage)))) (q.hit ||= [])[leg] = true; continue; }
    if (Math.hypot(p.x - q.x, p.y - q.y) < q.radius + .3) { w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * q.damage))); q.life = 0; }
  }
  e.stalkShots = e.stalkShots.filter((q) => q.life > 0);
}
// The turret on its back: it rises, aims for `warn` s, and fires the next of its moves.
function tickTurret(e, w, dt) {
  const T = STALKER.turret, p = w.player;
  if (e.stalkForm === "pool" || e.stalkForm === "mist") { e.stalkTurret = null; e.stalkBlades = null; e.stalkLimb = null; e.stalkTurretUp = Math.max(0, (e.stalkTurretUp || 0) - dt * 3); return; }
  if (e.stalkBlades) tickBlades(e, w, dt);
  const t = e.stalkTurret;
  if (e.stalkLimb) tickLimb(e, w, dt);
  if (!t && (e.stalkBlades || e.stalkLimb)) return; // one back move at a time
  e.stalkTurretUp = Math.max(0, Math.min(1, (e.stalkTurretUp || 0) + (t ? dt * 4 : -dt * 1.5)));
  if (!t) { e.stalkTurretClock = (e.stalkTurretClock ?? roll(`${e.id}:turret:first`, T.every)) - dt; if (e.stalkTurretClock > 0) return;
    const n = (e.stalkTurretSeq = (e.stalkTurretSeq || 0) + 1), move = T.moves[(n - 1) % T.moves.length];
    e.stalkTurret = { move, t: T.warn, total: T.warn, aim: Math.atan2(p.y - e.y, p.x - e.x) }; return; }
  t.t -= dt; if (t.move === "cone") { /* the cone holds its aim once marked */ } else t.aim = Math.atan2(p.y - e.y, p.x - e.x);
  if (t.t > 0) return;
  const from = { x: e.x, y: e.y - .5 }, a = t.aim;
  if (t.move === "orbs") { const O = T.orbs; for (let i = 0; i < O.count; i++) { const b = a + (i - (O.count - 1) / 2) * O.spread; shoot(e, { kind: "orb", x: from.x, y: from.y, vx: Math.cos(b) * O.speed, vy: Math.sin(b) * O.speed, home: O.turn, life: O.life, radius: O.radius, damage: O.damage }); } }
  else if (t.move === "cone") { const C = T.cone, d = Math.hypot(p.x - e.x, p.y - e.y), off = Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - e.y, p.x - e.x) - a), Math.cos(Math.atan2(p.y - e.y, p.x - e.x) - a))); if (d <= C.range && off <= C.half) w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * C.damage))); e.stalkConeFlash = { aim: a, t: .25 }; }
  else if (t.move === "ring") { const R = T.ring; for (let i = 0; i < R.count; i++) shoot(e, { kind: "ring", orbit: true, a: i / R.count * Math.PI * 2, delay: .3 + i * R.gap, x: e.x, y: e.y, vx: 0, vy: 0, life: 9, radius: R.radius, damage: R.damage }); }
  else if (t.move === "xblade") e.stalkBlades = { phase: "rise", t: T.xblade.rise, total: T.xblade.rise, aim: a };
  else if (STALKER.limb[t.move]) startLimb(e, w, t.move, a);
  e.stalkTurret = null; e.stalkTurretClock = roll(`${e.id}:turret:${e.stalkTurretSeq}`, T.every);
}
// The crossed blades: they rise from its back (aiming at the Wayfarer), swing and cross in front of it (a blow there), hold the X,
// then a larger X flies off in a straight line toward where the Wayfarer stood.
function tickBlades(e, w, dt) {
  const b = e.stalkBlades, X = STALKER.turret.xblade, p = w.player; b.t -= dt;
  if (b.phase === "rise") { b.aim = Math.atan2(p.y - e.y, p.x - e.x); if (b.t <= 0) Object.assign(b, { phase: "swing", t: X.swing, total: X.swing }); return; }
  if (b.phase === "swing") { if (b.t <= 0) { const at = { x: e.x + Math.cos(b.aim) * X.reach, y: e.y + Math.sin(b.aim) * X.reach }; if (Math.hypot(p.x - at.x, p.y - at.y) <= X.cross) w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * X.damage))); Object.assign(b, { phase: "hold", t: X.hold, total: X.hold }); } return; }
  if (b.phase === "hold" && b.t <= 0) {
    const at = { x: e.x + Math.cos(b.aim) * X.reach, y: e.y + Math.sin(b.aim) * X.reach }, a = Math.atan2(p.y - at.y, p.x - at.x);
    shoot(e, { kind: "xblade", x: at.x, y: at.y, vx: Math.cos(a) * X.speed, vy: Math.sin(a) * X.speed, aim: a, life: X.life, radius: X.radius, damage: X.shot });
    e.stalkBlades = null;
  }
}
// The appendage out of its back. Each move was marked during the turret's `warn`; here it strikes.
function segDist(p, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l)); return Math.hypot(p.x - (a.x + vx * k), p.y - (a.y + vy * k)); }
const blow = (e, share) => Math.max(1, Math.ceil((e.damage || 1) * share));
export function spikeLines(e, aim) { const L = STALKER.limb.spikes; return [-1, 0, 1].map((k) => { const a = aim + k * L.spread; return { a, from: { x: e.x, y: e.y }, to: { x: e.x + Math.cos(a) * L.length, y: e.y + Math.sin(a) * L.length } }; }); }
function startLimb(e, w, move, aim) {
  const L = STALKER.limb[move], p = w.player;
  if (move === "sword") e.stalkLimb = { move, t: L.time, total: L.time, aim, struck: false };
  else if (move === "spikes") {
    const lines = spikeLines(e, aim); if (lines.some((q) => segDist(p, q.from, q.to) <= L.width)) w.hurt(e, blow(e, L.damage));
    for (const q of lines) shoot(e, { kind: "blast", x: q.to.x, y: q.to.y, vx: Math.cos(q.a) * L.blast.speed, vy: Math.sin(q.a) * L.blast.speed, life: L.blast.life, radius: L.blast.radius, damage: L.blast.damage, bounces: L.blast.bounces });
    e.stalkLimb = { move, t: L.time, total: L.time, aim };
  }
  else if (move === "tendril") e.stalkLimb = { move, t: L.count * L.every + L.arm + L.burst, total: L.count * L.every + L.arm + L.burst, aim, made: 0, next: 0 };
  else if (move === "boomerang") { shoot(e, { kind: "boomer", x: e.x, y: e.y - .4, vx: Math.cos(aim) * L.speed, vy: Math.sin(aim) * L.speed, life: L.life, radius: L.radius, damage: L.damage, age: 0, out: L.out, ghost: true }); e.stalkLimb = { move, t: L.out * 2.2, total: L.out * 2.2, aim }; }
}
function tickLimb(e, w, dt) {
  const l = e.stalkLimb, L = STALKER.limb[l.move], p = w.player; l.t -= dt;
  if (l.move === "sword" && !l.struck && l.t <= l.total / 2) { l.struck = true; const d = dist(e, p), off = Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - e.y, p.x - e.x) - l.aim), Math.cos(Math.atan2(p.y - e.y, p.x - e.x) - l.aim))); if (d <= L.reach && off <= L.arc) w.hurt(e, blow(e, L.damage)); }
  if (l.move === "tendril") { l.next -= dt; if (l.made < L.count && l.next <= 0) { l.made++; l.next = L.every; const list = (e.stalkErupts ||= []); if (list.length < L.cap) list.push({ x: p.x, y: p.y, t: L.arm, total: L.arm, burst: L.burst, struck: false }); } }
  if (l.move === "boomerang" && !(e.stalkShots || []).some((q) => q.kind === "boomer")) l.t = Math.min(l.t, 0);
  if (l.t <= 0) e.stalkLimb = null;
}
// The tendril's eruptions: each marked where the Wayfarer stood, bursting `arm` s later.
function tickErupts(e, w, dt) {
  if (!e.stalkErupts?.length) return; const L = STALKER.limb.tendril, p = w.player;
  for (const q of e.stalkErupts) { q.t -= dt; if (q.t <= 0 && !q.struck) { q.struck = true; if (Math.hypot(p.x - q.x, p.y - q.y) <= L.radius) w.hurt(e, blow(e, L.damage)); } if (q.t <= -q.burst) q.done = true; }
  e.stalkErupts = e.stalkErupts.filter((q) => !q.done);
}

// The cat's moves in order; how close each wants to be.
export function catMoveNext(e) { const P = STALKER.cat.pick; return P[((e.stalkCatSeq = (e.stalkCatSeq || 0) + 1) - 1) % P.length]; }
const catRange = (move) => move === "flurry" ? STALKER.cat.flurry.range : move === "tide" ? STALKER.cat.tide.range : STALKER.forms.cat.range;
// The little chomping puddles (at most `cap`): they roam toward the Wayfarer, mark a bite under them, and bite.
function spawnChompers(e, w) {
  const C = STALKER.pool.split, list = (e.stalkChompers ||= []), room = Math.max(0, C.cap - list.length);
  for (let i = 0; i < Math.min(C.count, room); i++) { const a = i / C.count * Math.PI * 2; list.push({ x: e.x + Math.cos(a) * .6, y: e.y + Math.sin(a) * .6, life: C.life, state: "roam", t: roll(`${e.id}:chomp:${e.stalkPoolSeq}:${i}`, C.gap), orbit: a, at: null }); }
}
function tickChompers(e, w, dt) {
  if (!e.stalkChompers?.length) return; const C = STALKER.pool.split, p = w.player;
  for (const q of e.stalkChompers) {
    q.life -= dt; q.t -= dt;
    if (q.state === "roam") { q.orbit += dt * .9; const to = { x: p.x + Math.cos(q.orbit) * .9, y: p.y + Math.sin(q.orbit) * .6 }, v = unit(to.x - q.x, to.y - q.y), st = Math.min(Math.hypot(to.x - q.x, to.y - q.y), C.speed * dt), nx = q.x + v.x * st, ny = q.y + v.y * st; if ((w.free || w.open)(nx, ny)) { q.x = nx; q.y = ny; }
      if (q.t <= 0 && Math.hypot(p.x - q.x, p.y - q.y) <= C.reach) { q.state = "warn"; q.t = C.warn; q.at = { x: p.x, y: p.y }; } }
    else if (q.state === "warn" && q.t <= 0) { if (Math.hypot(p.x - q.at.x, p.y - q.at.y) <= C.radius) w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * C.damage))); q.state = "bite"; q.t = .18; }
    else if (q.state === "bite" && q.t <= 0) { q.state = "roam"; q.t = roll(`${e.id}:chompgap:${q.orbit.toFixed(2)}`, C.gap); q.at = null; }
  }
  e.stalkChompers = e.stalkChompers.filter((q) => q.life > 0);
}
// The fog and the veil: it fogs the section and fights on all but unseen. `e.stalkFogPlan`: the hunt's open approach, fogging once
// it is within range; then every `again` s in the fight. While veiled it cannot be auto-aimed (`hidden`) but a blow still lands.
export function stalkerFog(e, w, dt) {
  const G = STALKER.fog, p = w.player;
  if (e.stalkVeil > 0) { e.stalkVeil = Math.max(0, e.stalkVeil - dt); e.hidden = e.stalkVeil > 0; if (!e.hidden) e.stalkFogClock = roll(`${e.id}:fogagain:${e.stalkCycle || 0}`, G.again); return; }
  const veil = (time) => { e.stalkVeil = time; e.hidden = true; w.fogged?.(e, time); };
  if (e.stalkFogPlan) { if (dist(e, p) <= G.range) { e.stalkFogPlan = false; veil(G.time); } return; }
  if (e.stalkForm === "pool" || e.stalkForm === "mist") return;
  e.stalkFogClock = (e.stalkFogClock ?? roll(`${e.id}:fogfirst`, G.again)) - dt;
  if (e.stalkFogClock <= 0) veil(G.againTime);
}
// Lying in wait. Returns true while it still hides (the rest of the frame is skipped).
export function stalkerLurk(e, w, dt) {
  if (!e.stalkLurk) return false;
  const L = STALKER.lurk, p = w.player, d = dist(e, p), l = e.stalkLurk, hurt = Number.isFinite(e.stalkLastHp) && e.hp < e.stalkLastHp;
  l.t = (l.t || 0) + dt; e.hidden = true; e.untargetable = true; e.telegraph = 0; e.stalkHide = 1; e.facingX = p.x >= e.x ? 1 : -1;
  e.stalkPerch = !!w.elev && (w.elev(e.x, e.y) || 0) - (w.elev(p.x, p.y) || 0) >= LOOK.perchRise;
  if (d <= L.trigger || hurt || l.t >= L.max) {
    // Out of the shadows: it fades in as it springs.
    e.stalkLurk = null; e.hidden = false; e.untargetable = false; e.stalkHide = 0; e.stalkReveal = L.reveal; w.revealed?.(e);
    if (e.stalkForm === "ape") setAct(e, "leapWarn", L.spring, { to: { x: p.x, y: p.y } }); else setAct(e, "pounceWarn", L.spring, { to: { x: p.x, y: p.y } });
    e.stalkLastHp = e.hp; return false;
  }
  if (d > L.lose) step(e, w, p, L.creep, dt); // left behind: it follows, unseen
  e.stalkAct = { kind: "lurk", t: 0, total: 0 }; e.stalkLastHp = e.hp; return true;
}

// A long laser bolt flying straight on from `from` along `ang` (the gorilla's lasers).
function fireLaser(e, ang, from) { const L = STALKER.arms.laser; shoot(e, { kind: "laser", x: from.x, y: from.y, vx: Math.cos(ang) * L.speed, vy: Math.sin(ang) * L.speed, life: L.life, radius: L.width / 2, len: L.len, damage: L.damage, aim: ang }); }

// The mirage. Returns true while it lasts (it replaces the act machine; shots and eruptions still run).
export function stalkerMirage(e, w, dt) {
  const M = STALKER.mirage, p = w.player;
  if (!e.stalkMirage) {
    e.stalkMirageClock = (e.stalkMirageClock ?? roll(`${e.id}:mirage:first`, M.every)) - dt;
    if (e.stalkMirageClock > 0 || e.stalkAct?.kind !== "prowl" || !["cat", "ape"].includes(e.stalkForm)) return false;
    const n = (e.stalkMirageSeq = (e.stalkMirageSeq || 0) + 1);
    e.stalkMirage = { t: M.time, phase: "orbit", pt: roll(`${e.id}:mrest:${n}`, M.rest), ang: Math.atan2(e.y - p.y, e.x - p.x), dir: n % 2 ? 1 : -1, n, healed: 0, hid: false };
    if (chance(`${e.id}:mfog:${n}`) < M.fogChance) w.fogged?.(e, M.time);
  }
  const m = e.stalkMirage, d = dist(e, p); m.t -= dt; m.pt -= dt; e.hidden = true; e.stalkAct = { kind: "mirage", t: 0, total: 0 }; e.telegraph = 0;
  if (m.t <= 0) { e.stalkMirage = null; e.hidden = (e.stalkVeil || 0) > 0; e.stalkRegen = false; e.stalkMirageClock = roll(`${e.id}:mirage:${m.n}`, M.every); setAct(e, "prowl", .3); return false; }
  const strike = e.stalkForm === "ape" ? "punch" : "slash";
  switch (m.phase) {
    case "orbit": { m.ang += m.dir * 1.6 * dt; step(e, w, { x: p.x + Math.cos(m.ang) * M.orbit, y: p.y + Math.sin(m.ang) * M.orbit }, M.speed, dt);
      if (m.pt <= 0) { if (!m.hid && chance(`${e.id}:mhide:${m.n}`) < M.hideChance) { m.phase = "hide"; m.pt = M.hide.time; } else { m.phase = "in"; m.pt = M.reachTime; } } break; }
    case "in": step(e, w, p, M.dash, dt); if (d <= M.reach) { m.phase = "strike"; m.left = M.strikes[0] + hashSeed(`${e.id}:mstrikes:${m.n}:${m.t.toFixed(1)}`) % (M.strikes[1] - M.strikes[0] + 1); m.pt = 0; } else if (m.pt <= 0) { m.phase = "orbit"; m.pt = roll(`${e.id}:mrest2:${m.n}`, M.rest); } break;
    case "strike": if (m.pt <= 0) { hit(e, w, M.reach + .15, M.damage); if (strike === "slash") e.stalkSlash = { t: .14, n: m.left, aim: Math.atan2(p.y - e.y, p.x - e.x) }; else e.stalkStrike = { n: 0, t: .14, aim: Math.atan2(p.y - e.y, p.x - e.x) }; m.left--; m.pt = M.gap; if (m.left <= 0) { m.phase = "out"; m.pt = M.out.time; m.from = { x: p.x, y: p.y }; } } break;
    case "out": { const v = unit(e.x - m.from.x, e.y - m.from.y), sp = M.out.dist / M.out.time * dt; w.move(e, v.x * sp, v.y * sp); if (m.pt <= 0) { m.phase = "orbit"; m.pt = roll(`${e.id}:mrest3:${m.n}`, M.rest); } break; }
    case "hide": { const v = unit(e.x - p.x, e.y - p.y); if (d < M.hide.dist) step(e, w, { x: p.x + v.x * M.hide.dist, y: p.y + v.y * M.hide.dist }, M.speed, dt);
      const room = M.hide.cap * e.maxHp - m.healed, gain = Math.min(room, M.hide.regen * e.maxHp * dt); e.stalkRegen = gain > 0; if (gain > 0) { e.hp = Math.min(e.maxHp, e.hp + gain); m.healed += gain; e.stalkLastHp = e.hp; }
      if (m.pt <= 0) { m.phase = "orbit"; m.hid = true; e.stalkRegen = false; m.pt = roll(`${e.id}:mrest4:${m.n}`, M.rest); } break; }
  }
  e.facingX = p.x >= e.x ? 1 : -1;
  return true;
}

// The gorilla's arms. `e.stalkFists` (for drawing): where each launched fist is, and how high.
export function apeMoveNext(e) { const P = STALKER.arms.pick; return P[((e.stalkApeSeq = (e.stalkApeSeq || 0) + 1) - 1) % P.length]; }
const armRange = (move) => move === "leap" ? STALKER.forms.ape.range : STALKER.arms[move].range;
function startApeMove(e, w, move) {
  const A = STALKER.arms, p = w.player, aim = Math.atan2(p.y - e.y, p.x - e.x);
  if (move === "leap") { setAct(e, "leapWarn", STALKER.forms.ape.leap.warn, { to: { x: p.x, y: p.y } }); return; }
  if (move === "slam") { setAct(e, "slamWarn", A.slam.warn, { at: { x: p.x, y: p.y } }); return; }
  if (move === "combo") { setAct(e, "comboWarn", A.combo.warn, { n: 0, aim }); return; }
  setAct(e, `${move}Warn`, A[move].warn, { aim });
}
function knock(w, e, k) { const v = unit(w.player.x - e.x, w.player.y - e.y); w.displace?.(v.x * k, v.y * k); }
function tickApeAct(e, w, a, dt) {
  const A = STALKER.arms, p = w.player, d = dist(e, p), back = () => { e.stalkFists = null; setAct(e, "spring", STALKER.forms.ape.spring.time, { from: { x: p.x, y: p.y } }); };
  const retract = (fists) => setAct(e, "retract", A.retract, { fists });
  switch (a.kind) {
    case "grabWarn": a.aim = Math.atan2(p.y - e.y, p.x - e.x); if (a.t <= 0) setAct(e, "grab", A.grab.reach / A.grab.speed + .05, { aim: a.aim, fist: { x: e.x, y: e.y }, out: 0 }); return true;
    case "grab": {
      const st = A.grab.speed * dt; a.out += st; a.fist.x += Math.cos(a.aim) * st; a.fist.y += Math.sin(a.aim) * st; e.stalkFists = [{ ...a.fist, lift: .5 }];
      if (dist(a.fist, p) <= A.grab.catch && w.hurt(e, blow(e, A.grab.damage))) { setAct(e, "grabPull", A.grab.pull, { fist: a.fist }); return true; }
      if (a.out >= A.grab.reach || a.t <= 0) retract([{ ...a.fist, lift: .5 }]); return true;
    }
    case "grabPull": {
      // Caught: the fist hauls the Wayfarer in, then a blow.
      const v = unit(e.x - p.x, e.y - p.y), want = Math.max(0, d - 1.2), st = Math.min(want, want / Math.max(a.t, dt) * dt); if (st > 0) w.displace?.(v.x * st, v.y * st);
      e.stalkFists = [{ x: p.x, y: p.y, lift: .5 }]; if (a.t <= 0) { e.stalkFists = null; setAct(e, "fistWarn", STALKER.forms.ape.fist.warn * .6); } return true;
    }
    case "retract": { const k = Math.max(0, a.t) / A.retract; e.stalkFists = a.fists.map((f) => ({ x: e.x + (f.x - e.x) * k, y: e.y + (f.y - e.y) * k, lift: (f.lift || 0) * k })); if (a.t <= 0) back(); return true; }
    case "slamWarn": { const k = 1 - Math.max(0, a.t) / a.total; e.stalkFists = [{ x: e.x + (a.at.x - e.x) * Math.min(1, k * 2), y: e.y + (a.at.y - e.y) * Math.min(1, k * 2), lift: A.slam.lift * Math.min(1, k * 1.5) }]; if (a.t <= 0) setAct(e, "slam", A.slam.fall, { at: a.at }); return true; }
    case "slam": { const k = Math.max(0, a.t) / a.total; e.stalkFists = [{ ...a.at, lift: A.slam.lift * k }]; if (a.t <= 0) { if (dist(p, a.at) <= A.slam.radius) w.hurt(e, blow(e, A.slam.damage)); retract([{ ...a.at, lift: 0 }]); } return true; }
    case "sweepWarn": case "spinWarn": a.aim = Math.atan2(p.y - e.y, p.x - e.x); e.stalkFists = null; if (a.t <= 0) setAct(e, a.kind === "sweepWarn" ? "sweep" : "spin", A[a.kind === "sweepWarn" ? "sweep" : "spin"].time, { aim: a.aim, hits: {}, lasers: a.kind === "spinWarn" ? A.armLasers[((e.stalkSpinSeq = (e.stalkSpinSeq || 0) + 1) - 1) % A.armLasers.length] : 0, emitted: [0, 0] }); return true;
    case "sweep": case "spin": {
      // One arm whips back and forth across the front twice; or both arms swing half a circle each, round it.
      const S2 = A[a.kind], k = 1 - Math.max(0, a.t) / a.total, angs = a.kind === "sweep" ? [a.aim + S2.arc * Math.sin(k * Math.PI * 2)] : [a.aim + Math.PI * k, a.aim + Math.PI + Math.PI * k];
      const pass = a.kind === "sweep" ? Math.floor(k * 4) : 0; e.stalkFists = angs.map((g) => ({ x: e.x + Math.cos(g) * S2.reach, y: e.y + Math.sin(g) * S2.reach, lift: .4 }));
      if (!a.hits[pass] && e.stalkFists.some((f) => segDist(p, e, f) <= S2.width) && w.hurt(e, blow(e, S2.damage))) a.hits[pass] = true;
      if (a.lasers) angs.slice(0, a.lasers).forEach((g, i) => { while (a.emitted[i] <= Math.floor(Math.PI * k / A.laser.step)) { const ang = (i ? a.aim + Math.PI : a.aim) + a.emitted[i] * A.laser.step; a.emitted[i]++; fireLaser(e, ang, { x: e.x + Math.cos(ang) * S2.reach, y: e.y + Math.sin(ang) * S2.reach }); } });
      if (a.t <= 0) retract(e.stalkFists); return true;
    }
    case "lasersWarn": a.aim = Math.atan2(p.y - e.y, p.x - e.x); if (a.t <= 0) setAct(e, "lasers", A.lasers.fan.length * A.lasers.gap + .25, { aim: a.aim, n: 0, next: 0 }); return true;
    case "lasers": { a.next -= dt; while (a.next <= 0 && a.n < A.lasers.fan.length) { const ang = a.aim + A.lasers.fan[a.n] * Math.PI / 180; fireLaser(e, ang, { x: e.x + Math.cos(ang) * .6, y: e.y - .5 + Math.sin(ang) * .6 }); a.n++; a.next += A.lasers.gap; } e.stalkStrike = { n: 0, t: .1, aim: a.aim }; if (a.t <= 0) back(); return true; }
    case "chargeWarn": a.aim = Math.atan2(p.y - e.y, p.x - e.x); if (a.t <= 0) setAct(e, "charge", A.charge.time, { aim: a.aim }); return true;
    case "charge": {
      // Head down, straight at the Wayfarer: a hit knocks them flying (off a ledge or a branch, if there is one).
      const st = A.charge.speed * (e.speedMultiplier || 1) * dt, moved = w.move(e, Math.cos(a.aim) * st, Math.sin(a.aim) * st); e.facingX = Math.cos(a.aim) >= 0 ? 1 : -1;
      if (d <= A.charge.touch) { if (w.hurt(e, blow(e, A.charge.damage))) knock(w, e, A.charge.knock); back(); return true; }
      if (!moved || a.t <= 0) back(); return true;
    }
    case "comboWarn": {
      // Iron Fist: a jab, a cross, then a kick that knocks back.
      a.aim = Math.atan2(p.y - e.y, p.x - e.x); if (d > A.combo.reach) step(e, w, p, STALKER.forms.ape.speed * 1.4, dt);
      if (a.t > 0) return true;
      const kick = a.n === 2, r = kick ? A.combo.kick : A.combo.reach;
      if (d <= r + .2 && w.hurt(e, blow(e, A.combo.damage[a.n])) && kick) knock(w, e, A.combo.knock);
      e.stalkStrike = { n: a.n, t: .14, aim: a.aim };
      if (a.n < 2) setAct(e, "comboWarn", A.combo.warn, { n: a.n + 1, aim: a.aim }); else back();
      return true;
    }
  }
  return false;
}

// The energized form: a sphere of energy round it that hurts to touch and softens blows, thrown at the Wayfarer as it ends.
function tickEnergy(e, w, dt) {
  const E = STALKER.energized, p = w.player;
  if ((e.stalkCharged || 0) > 0) {
    e.stalkCharged -= dt; e.stalkAuraTick = (e.stalkAuraTick || 0) - dt;
    if (e.stalkAuraTick <= 0 && Math.hypot(p.x - e.x, p.y - e.y) <= E.aura) { e.stalkAuraTick = E.tick; w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * E.damage))); }
    if (e.stalkCharged <= 0) { const v = unit(p.x - e.x, p.y - e.y), S = E.sphere; shoot(e, { kind: "sphere", x: e.x, y: e.y - .4, vx: v.x * S.speed, vy: v.y * S.speed, life: S.life, radius: S.radius, damage: S.damage }); e.stalkCharged = 0; }
    return;
  }
  e.stalkEnergyClock = (e.stalkEnergyClock ?? roll(`${e.id}:energy:first`, E.every)) - dt;
  if (e.stalkEnergyClock <= 0 && e.stalkForm !== "pool" && e.stalkForm !== "mist") { e.stalkCharged = E.time; e.stalkAuraTick = 0; e.stalkEnergyClock = roll(`${e.id}:energy:${e.stalkCycle || 0}`, E.every) + E.time; }
}

// How it looks this frame (drawing only, stalker-render.ts): hiding in its own mist while it stalks at a distance (`stalkHide`
// 0–1, eased), perched on ground higher than the Wayfarer's (`stalkPerch`), creeping low as it closes in (`stalkCreep`).
export const LOOK = { hideFrom: 6, hideOver: 5, hideWait: .55, ease: 3, perchRise: 1 };
export function stalkerLook(e, w, dt, kind) {
  const p = w.player, d = dist(e, p), L = LOOK, elev = w.elev ? (w.elev(e.x, e.y) || 0) - (w.elev(p.x, p.y) || 0) : 0;
  const target = kind === "wait" ? L.hideWait : kind === "prowl" && d > L.hideFrom ? Math.min(1, (d - L.hideFrom) / L.hideOver) : 0;
  e.stalkHide = (e.stalkHide || 0) + (target - (e.stalkHide || 0)) * Math.min(1, dt * L.ease);
  e.stalkPerch = (kind === "prowl" || kind === "wait") && elev >= L.perchRise;
  e.stalkCreep = kind === "prowl" && d > (STALKER.forms[e.stalkForm]?.range || 5) * .75;
  if (e.stalkPerch || kind === "wait") e.facingX = p.x >= e.x ? 1 : -1;
}

// One frame of the Stalker (or of one of its copies or decoys). `w` is the game's adapter: player, dt, now, open(x, y) (ground
// it may stand on: never a building, shelter, town or lethal ground), move(e, dx, dy), fly(e, dx, dy) (the ape: over walls and
// up trees), elev(x, y), hurt(e, amount), sheltered (the Wayfarer is inside a building, shelter or town), door (the last open
// ground they stood on), summon(e, n) and decoys(e, n, at).
export function updateStalker(e, w) {
  if (e.dead || !(w.dt > 0)) return;
  const dt = Math.min(w.dt, .25), S = STALKER, p = w.player;
  // Never staggered: whatever the blow set, it fights on.
  e.hitStun = 0; e.recoil = 0; e.staggerImmune = true;
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
  if (e.stalkerKin || e.stalkerDecoy) { updateKin(e, w, dt); return; }
  if (e.stalkReveal > 0) e.stalkReveal = Math.max(0, e.stalkReveal - dt);
  if (stalkerLurk(e, w, dt)) return;
  stalkerFog(e, w, dt);
  if (e.stalkGhosts?.length) { for (const g of e.stalkGhosts) g.t -= dt; e.stalkGhosts = e.stalkGhosts.filter((g) => g.t > 0); }
  if (e.stalkCharges == null) e.stalkCharges = S.afterimage.charges;
  e.stalkDodgeGap = Math.max(0, (e.stalkDodgeGap || 0) - dt);
  if (e.stalkCharges < S.afterimage.charges && (e.stalkRecharge = (e.stalkRecharge || 0) + dt) >= S.afterimage.recharge) { e.stalkRecharge = 0; e.stalkCharges += 1; }
  const before = e.stalkLastHp, turned = stalkerAfterimage(e, w);
  if (!turned) stalkerSoften(e, before, dt);
  e.stalkLastHp = e.hp;
  // The swarm, once at each threshold.
  const called = (e.stalkCalled ||= []);
  S.swarm.at.forEach((at, i) => { if (!called[i] && e.hp <= e.maxHp * at) { called[i] = true; w.summon?.(e, S.swarm.count); } });
  if (turned) return;
  if (!e.stalkAct) beginForm(e, w, e.stalkForm || "cat");
  // The Wayfarer is inside: wait by the door, as a cat sitting still.
  if (w.sheltered) {
    if (e.stalkForm === "pool" || e.stalkForm === "mist") { e.stalkForm = "cat"; e.stalkBlades = null; }
    e.untargetable = false; e.stalkWaves = null;
    e.stalkLift = 0; e.telegraph = 0; e.stalkAct = { kind: "wait", t: 0, total: 0 };
    if (w.door && dist(e, w.door) > 1.4) step(e, w, w.door, S.forms.cat.speed * .6, dt);
    stalkerLook(e, w, dt, "wait");
    return;
  }
  if (e.stalkAct?.kind === "wait") beginForm(e, w, e.stalkForm);
  if (stalkerMirage(e, w, dt)) { tickShots(e, w, dt); tickErupts(e, w, dt); tickChompers(e, w, dt); if (e.stalkSlash) { e.stalkSlash.t -= dt; if (e.stalkSlash.t <= 0) e.stalkSlash = null; } if (e.stalkStrike) { e.stalkStrike.t -= dt; if (e.stalkStrike.t <= 0) e.stalkStrike = null; } return; }
  tickEnergy(e, w, dt); tickTurret(e, w, dt); tickShots(e, w, dt); tickErupts(e, w, dt); tickChompers(e, w, dt);
  if (e.stalkConeFlash) { e.stalkConeFlash.t -= dt; if (e.stalkConeFlash.t <= 0) e.stalkConeFlash = null; }
  e.stalkShieldAim = Math.atan2(p.y - e.y, p.x - e.x);
  if ((e.stalkShield || 0) > 0 && e.stalkAct?.kind !== "guard" && e.stalkForm !== "pool" && e.stalkForm !== "mist" && !["leap", "hop", "climb", "pounce", "flurry", "tide", "tideWarn"].includes(e.stalkAct?.kind)) setAct(e, "guard", e.stalkShield);
  const a = e.stalkAct, F = S.forms[e.stalkForm] || S.forms.cat, d = dist(e, p);
  a.t -= dt; e.telegraph = /Warn$/.test(a.kind) ? Math.max(0, a.t) : 0;
  if (e.stalkStrike) { e.stalkStrike.t -= dt; if (e.stalkStrike.t <= 0) e.stalkStrike = null; }
  if (e.stalkSlash) { e.stalkSlash.t -= dt; if (e.stalkSlash.t <= 0) e.stalkSlash = null; }
  stalkerLook(e, w, dt, a.kind);
  if (e.stalkForm === "ape" && tickApeAct(e, w, a, dt)) return;
  if (!["grab", "grabPull", "retract", "slamWarn", "slam", "sweep", "spin"].includes(a.kind)) e.stalkFists = null;
  switch (a.kind) {
    case "prowl": {
      // Close in to its range, circling once there; pounce or leap when the prowl is over.
      if (e.stalkForm === "ape" && !e.stalkApeNext) e.stalkApeNext = apeMoveNext(e);
      if (e.stalkForm === "cat" && !e.stalkCatNext) e.stalkCatNext = catMoveNext(e);
      const keep = e.stalkForm === "ape" ? Math.min(F.range, armRange(e.stalkApeNext)) * .7 : Math.min(F.range, catRange(e.stalkCatNext)) * .7;
      if (e.stalkCreepIn && d <= S.approach.creepUntil) e.stalkCreepIn = false; // close enough: it breaks into a run
      if (d > keep) { step(e, w, p, F.speed * (e.stalkCreepIn ? S.approach.creepSpeed : 1), dt); const nd = dist(e, p), gain = (e.stalkPrevD ?? nd + 1) - nd; e.stalkStuck = gain > F.speed * dt * .25 ? 0 : (e.stalkStuck || 0) + dt; e.stalkPrevD = nd; }
      else { e.stalkPrevD = null; const ang = Math.atan2(e.y - p.y, e.x - p.x) + (hashSeed(`${e.id}:orbit`) % 2 ? 1 : -1) * .9 * dt; step(e, w, { x: p.x + Math.cos(ang) * keep, y: p.y + Math.sin(ang) * keep }, F.speed * .6, dt); }
      // Walled off (a cliff, a great tree, an enclosure): the cat hops a near ledge or climbs over to the Wayfarer.
      if (e.stalkForm === "cat" && (e.stalkStuck || 0) >= S.climb.stuck) { e.stalkStuck = 0; e.stalkPrevD = null;
        if (d <= S.climb.hop) setAct(e, "hop", S.climb.hopTime, { from: { x: e.x, y: e.y }, to: landing(w, p, e) });
        else setAct(e, "climb", S.climb.time);
        break; }
      const reach = e.stalkForm === "ape" ? ((e.stalkStuck || 0) > 0 ? S.forms.ape.fly : armRange(e.stalkApeNext)) : catRange(e.stalkCatNext);
      if (a.t <= 0 && d <= reach) {
        const v = w.playerVelocity || { x: 0, y: 0 }, lead = e.stalkForm === "cat" ? F.pounce.warn * .5 : 0;
        const aim = { x: p.x + v.x * lead, y: p.y + v.y * lead };
        if (e.stalkForm === "cat") { const move = e.stalkCatNext || "pounce"; e.stalkCatNext = null;
          if (move === "flurry") setAct(e, "flurryWarn", S.cat.flurry.warn, { aim: Math.atan2(p.y - e.y, p.x - e.x) });
          else if (move === "tide") setAct(e, "tideWarn", S.cat.tide.warn, { aim: Math.atan2(p.y - e.y, p.x - e.x) });
          else setAct(e, "pounceWarn", F.pounce.warn, { to: aim }); }
        else { const move = (e.stalkStuck || 0) > 0 ? "leap" : e.stalkApeNext; e.stalkApeNext = null; startApeMove(e, w, move); }
      }
      break;
    }
    case "pounceWarn": if (a.t <= 0) { const v = unit(a.to.x - e.x, a.to.y - e.y), len = Math.min(dist(e, a.to) + .6, F.range + 1); setAct(e, "pounce", F.pounce.time, { from: { x: e.x, y: e.y }, to: { x: e.x + v.x * len, y: e.y + v.y * len } }); } break;
    case "pounce": {
      // A low, fast spring along the ground: it stops where the ground stops.
      const sp = dist(a.from, a.to) / a.total, moved = step(e, w, a.to, sp / (e.speedMultiplier || 1), dt);
      // A ledge or a wall in the way: it springs up onto it instead.
      if (!moved && !a.struck && dist(e, a.to) > .3) { setAct(e, "hop", STALKER.climb.hopTime, { from: { x: e.x, y: e.y }, to: landing(w, p, e) }); break; }
      if (!a.struck && hit(e, w, F.pounce.reach, F.pounce.damage)) a.struck = true;
      if (a.t <= 0) setAct(e, "swipeWarn", F.swipe.warn);
      break;
    }
    case "swipeWarn": if (a.t <= 0) { hit(e, w, F.swipe.reach, F.swipe.damage); setAct(e, "spring", F.spring.time, { from: { x: p.x, y: p.y } }); } break;
    case "leapWarn": if (a.t <= 0) { const to = landing(w, a.to, e); setAct(e, "leap", a.flyTime || F.leap.time, { from: { x: e.x, y: e.y }, to }); } break;
    case "leap": {
      // Over walls and up trees: an arc to the marked ground, the blow where it lands.
      const k = 1 - Math.max(0, a.t) / a.total; e.x = a.from.x + (a.to.x - a.from.x) * k; e.y = a.from.y + (a.to.y - a.from.y) * k; e.stalkLift = Math.sin(Math.PI * k) * F.leap.lift;
      e.facingX = a.to.x >= a.from.x ? 1 : -1;
      if (a.t <= 0) { e.x = a.to.x; e.y = a.to.y; e.stalkLift = 0; hit(e, w, F.leap.radius, F.leap.damage, a.to); e.stalkStuck = 0; setAct(e, "fistWarn", F.fist.warn); }
      break;
    }
    case "fistWarn": if (a.t <= 0) { hit(e, w, F.fist.reach, F.fist.damage); setAct(e, "spring", F.spring.time, { from: { x: p.x, y: p.y } }); } break;
    case "spring": {
      // Hit and away, like the Nanobot Knight.
      const v = unit(e.x - a.from.x, e.y - a.from.y), sp = F.spring.distance / F.spring.time * dt;
      if (e.stalkForm === "ape") { const nx = e.x + v.x * sp, ny = e.y + v.y * sp; if (w.open(nx, ny)) { e.x = nx; e.y = ny; } else w.move(e, v.x * sp, v.y * sp); e.stalkLift = Math.sin(Math.PI * (1 - Math.max(0, a.t) / a.total)) * .8; }
      else w.move(e, v.x * sp, v.y * sp);
      if (a.t <= 0) { e.stalkLift = 0; beginForm(e, w, nextForm(e, w)); }
      break;
    }
    case "hop": {
      const k = 1 - Math.max(0, a.t) / a.total; e.x = a.from.x + (a.to.x - a.from.x) * k; e.y = a.from.y + (a.to.y - a.from.y) * k; e.stalkLift = Math.sin(Math.PI * k) * S.climb.hopLift;
      e.facingX = a.to.x >= a.from.x ? 1 : -1;
      if (a.t <= 0) { e.x = a.to.x; e.y = a.to.y; e.stalkLift = 0; setAct(e, "swipeWarn", F.swipe.warn); }
      break;
    }
    case "climb": {
      // Up and over: claws in the bark or the stone, straight at the Wayfarer, never into a building, shelter or town.
      const v = unit(p.x - e.x, p.y - e.y), st = Math.min(d, S.climb.speed * (e.speedMultiplier || 1) * dt), nx = e.x + v.x * st, ny = e.y + v.y * st;
      e.facingX = v.x >= 0 ? 1 : -1; e.stalkClimb = true;
      if ((w.free || w.open)(nx, ny)) { e.x = nx; e.y = ny; }
      const there = w.open(e.x, e.y) && (d <= F.range * .5 || (w.elev ? Math.abs((w.elev(p.x, p.y) || 0) - (w.elev(e.x, e.y) || 0)) < 1 && d <= F.range : d <= F.range));
      if (there || a.t <= 0) { e.stalkClimb = false; if (!w.open(e.x, e.y)) { const q = landing(w, p, null) || landing(w, e, null); if (q) { e.x = q.x; e.y = q.y; } } setAct(e, "prowl", .2); }
      break;
    }
    case "guard": {
      // Behind the liquid shield it gives ground sideways, then comes again in a new form.
      const side = hashSeed(`${e.id}:guard:${e.stalkCycle}`) % 2 ? 1 : -1, v = unit(e.x - p.x, e.y - p.y);
      w.move(e, (-v.y * side + v.x * .4) * S.shield.speed * dt, (v.x * side + v.y * .4) * S.shield.speed * dt);
      if (a.t <= 0) beginForm(e, w, nextForm(e, w));
      break;
    }
    case "mistGather": {
      // It thins into silver mist where it stands.
      if (a.t <= 0) setAct(e, "mistRing", STALKER.mist.ring, { ang: Math.atan2(e.y - p.y, e.x - p.x), passes: 0 });
      break;
    }
    case "mistRing": {
      // The mist surrounds the Wayfarer, wheeling round them.
      const M = STALKER.mist; a.ang += M.spin * dt; const nx = p.x + Math.cos(a.ang) * M.radius, ny = p.y + Math.sin(a.ang) * M.radius * .8;
      if ((w.free || w.open)(nx, ny)) { e.x = nx; e.y = ny; }
      if (a.t <= 0) { if (a.passes >= M.passes) { const q = landing(w, e, null) || landing(w, p, null); if (q) { e.x = q.x; e.y = q.y; } e.stalkForm = "cat"; beginForm(e, w, "cat"); break; }
        setAct(e, "mistPass", M.pass, { ang: a.ang, passes: a.passes, from: { x: e.x, y: e.y }, to: { x: 2 * p.x - e.x, y: 2 * p.y - e.y }, struck: false }); }
      break;
    }
    case "mistPass": {
      // It rushes through the Wayfarer: a touch rots them.
      const M = STALKER.mist, k = 1 - Math.max(0, a.t) / a.total, nx = a.from.x + (a.to.x - a.from.x) * k, ny = a.from.y + (a.to.y - a.from.y) * k;
      if ((w.free || w.open)(nx, ny)) { e.x = nx; e.y = ny; }
      if (!a.struck && dist(e, p) <= M.touch) { a.struck = true; w.rot?.(e, M.rot); }
      if (a.t <= 0) setAct(e, "mistRing", M.between, { ang: Math.atan2(e.y - p.y, e.x - p.x) + .9, passes: a.passes + 1 });
      break;
    }
    case "slide": {
      // The pool: it cannot be hit, and slides round to another side.
      const moved = step(e, w, a.to, S.forms.pool.speed, dt);
      if (a.t <= 0 || dist(e, a.to) < .2 || !moved) { const n = (e.stalkPoolSeq = (e.stalkPoolSeq || 0) + 1); if (n % 2) setAct(e, "under", S.pool.under.time); else setAct(e, "split", S.pool.split.time); }
      break;
    }
    case "under": {
      // Under the Wayfarer, then the mouth rises round them.
      const U = S.pool.under, v = unit(p.x - e.x, p.y - e.y), st = Math.min(d, U.speed * dt), nx = e.x + v.x * st, ny = e.y + v.y * st; if ((w.free || w.open)(nx, ny)) { e.x = nx; e.y = ny; }
      if (d < .35 || a.t <= 0) setAct(e, "mouthWarn", U.warn, { at: { x: p.x, y: p.y } });
      break;
    }
    case "mouthWarn": if (a.t <= 0) setAct(e, "mouth", S.pool.under.bite, { at: a.at }); break;
    case "mouth": if (a.t <= 0) { if (dist(p, a.at) <= S.pool.under.radius) w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * S.pool.under.damage))); setAct(e, "rise", S.forms.pool.rise); } break;
    case "split": if (a.t <= 0) { spawnChompers(e, w); setAct(e, "rise", S.forms.pool.rise); } break;
    case "flurryWarn": a.aim = Math.atan2(p.y - e.y, p.x - e.x); if (a.t <= 0) setAct(e, "flurry", S.cat.flurry.strikes * S.cat.flurry.every, { aim: a.aim, n: 0, next: 0 }); break;
    case "flurry": {
      // Swipe after swipe, pressing forward.
      const R = S.cat.flurry; a.next -= dt; e.facingX = p.x >= e.x ? 1 : -1;
      if (a.next <= 0 && a.n < R.strikes) { a.n++; a.next = R.every; step(e, w, p, R.lunge / R.every * .5, R.every); hit(e, w, R.reach, R.damage); e.stalkSlash = { t: .14, n: a.n, aim: Math.atan2(p.y - e.y, p.x - e.x) }; }
      if (a.t <= 0) setAct(e, "spring", F.spring.time, { from: { x: p.x, y: p.y } });
      break;
    }
    case "tideWarn": if (a.t <= 0) { const T = S.cat.tide; e.untargetable = true; e.stalkWaves = T.widths.map((wd, i) => ({ ox: e.x, oy: e.y, aim: a.aim, d: 0, width: wd, delay: i * T.gap, hit: false, n: i })); setAct(e, "tide", T.length / T.speed + T.gap * (T.widths.length - 1) + .1, { aim: a.aim }); } break;
    case "tide": {
      // It is the first wave; the others follow it, each wider.
      const T = S.cat.tide, w0 = e.stalkWaves?.[0];
      for (const q of e.stalkWaves || []) { if (q.delay > 0) { q.delay -= dt; continue; } q.d = Math.min(T.length, q.d + T.speed * dt);
        const cx = q.ox + Math.cos(q.aim) * q.d, cy = q.oy + Math.sin(q.aim) * q.d, along = (p.x - cx) * Math.cos(q.aim) + (p.y - cy) * Math.sin(q.aim), perp = -(p.x - cx) * Math.sin(q.aim) + (p.y - cy) * Math.cos(q.aim);
        if (!q.hit && Math.abs(along) <= T.depth && Math.abs(perp) <= q.width / 2 && w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * T.damage[q.n])))) q.hit = true; }
      if (w0) { const tx = w0.ox + Math.cos(w0.aim) * w0.d, ty = w0.oy + Math.sin(w0.aim) * w0.d; if ((w.free || w.open)(tx, ty)) { e.x = tx; e.y = ty; } }
      if (a.t <= 0) { e.stalkWaves = null; e.untargetable = false; const q = landing(w, e, null) || landing(w, p, null); if (q) { e.x = q.x; e.y = q.y; } setAct(e, "spring", F.spring.time, { from: { x: p.x, y: p.y } }); }
      break;
    }
    case "rise": if (a.t <= 0) { const f = hashSeed(`${e.id}:rise:${e.stalkCycle}`) % 2 ? "cat" : "ape"; e.stalkForm = f; beginForm(e, w, f); } break;
    default: beginForm(e, w, e.stalkForm);
  }
}
