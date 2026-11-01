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
  turret: { every: [3.2, 4.6], warn: .6, cap: 12, moves: ["orbs", "cone", "ring", "xblade"],
    orbs: { count: 3, speed: 4.2, turn: 2.4, life: 3.2, radius: .3, damage: .45, spread: .45 },
    cone: { range: 6.5, half: .42, damage: .9 },
    ring: { count: 4, orbit: 1.3, spin: 3, gap: .5, speed: 6.5, life: 2.4, radius: .3, damage: .4 },
    // Two great liquid blades rise from its back, swing and cross in an X in front of it (`reach` tiles out, each blade `length`
    // tiles: longer than its body), then a larger X flies straight at where the Wayfarer stood (no homing).
    xblade: { rise: .5, swing: .3, hold: .15, reach: 1.7, length: 2.3, cross: 1.25, damage: 1, speed: 6.5, life: 2.6, radius: 1.5, shot: 1.1 } },
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
export function ambushSpots(seed, seq, player, heading) {
  const back = Math.atan2(-(heading?.y || 1), -(heading?.x || 0)), out = [];
  for (let i = 0; i < 12; i++) { const a = back + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .45, r = roll(`${seed}:stalker:spot:${seq}:${i}`, STALKER.hunt.spawn); out.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r }); }
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
  if (n % 3 === 0 && e.stalkForm !== "pool") return "pool";
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
    q.x += q.vx * dt; q.y += q.vy * dt; q.spin = (q.spin || 0) + dt * 9;
    if (w.shotBlocked?.(q.x + .5, q.y + .5)) { q.life = 0; continue; }
    if (Math.hypot(p.x - q.x, p.y - q.y) < q.radius + .3) { w.hurt(e, Math.max(1, Math.ceil((e.damage || 1) * q.damage))); q.life = 0; }
  }
  e.stalkShots = e.stalkShots.filter((q) => q.life > 0);
}
// The turret on its back: it rises, aims for `warn` s, and fires the next of its moves.
function tickTurret(e, w, dt) {
  const T = STALKER.turret, p = w.player;
  if (e.stalkForm === "pool" || e.stalkForm === "mist") { e.stalkTurret = null; e.stalkBlades = null; e.stalkTurretUp = Math.max(0, (e.stalkTurretUp || 0) - dt * 3); return; }
  if (e.stalkBlades) tickBlades(e, w, dt);
  const t = e.stalkTurret;
  if (!t && e.stalkBlades) return; // one back move at a time
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
    if (e.stalkForm === "pool" || e.stalkForm === "mist") { e.stalkForm = "cat"; e.untargetable = false; e.stalkBlades = null; }
    e.stalkLift = 0; e.telegraph = 0; e.stalkAct = { kind: "wait", t: 0, total: 0 };
    if (w.door && dist(e, w.door) > 1.4) step(e, w, w.door, S.forms.cat.speed * .6, dt);
    return;
  }
  if (e.stalkAct?.kind === "wait") beginForm(e, w, e.stalkForm);
  tickEnergy(e, w, dt); tickTurret(e, w, dt); tickShots(e, w, dt);
  if (e.stalkConeFlash) { e.stalkConeFlash.t -= dt; if (e.stalkConeFlash.t <= 0) e.stalkConeFlash = null; }
  e.stalkShieldAim = Math.atan2(p.y - e.y, p.x - e.x);
  if ((e.stalkShield || 0) > 0 && e.stalkAct?.kind !== "guard" && e.stalkForm !== "pool" && e.stalkForm !== "mist" && !["leap", "hop", "climb", "pounce"].includes(e.stalkAct?.kind)) setAct(e, "guard", e.stalkShield);
  const a = e.stalkAct, F = S.forms[e.stalkForm] || S.forms.cat, d = dist(e, p);
  a.t -= dt; e.telegraph = /Warn$/.test(a.kind) ? Math.max(0, a.t) : 0;
  switch (a.kind) {
    case "prowl": {
      // Close in to its range, circling once there; pounce or leap when the prowl is over.
      const keep = F.range * .7;
      if (d > keep) { step(e, w, p, F.speed, dt); const nd = dist(e, p), gain = (e.stalkPrevD ?? nd + 1) - nd; e.stalkStuck = gain > F.speed * dt * .25 ? 0 : (e.stalkStuck || 0) + dt; e.stalkPrevD = nd; }
      else { e.stalkPrevD = null; const ang = Math.atan2(e.y - p.y, e.x - p.x) + (hashSeed(`${e.id}:orbit`) % 2 ? 1 : -1) * .9 * dt; step(e, w, { x: p.x + Math.cos(ang) * keep, y: p.y + Math.sin(ang) * keep }, F.speed * .6, dt); }
      // Walled off (a cliff, a great tree, an enclosure): the cat hops a near ledge or climbs over to the Wayfarer.
      if (e.stalkForm === "cat" && (e.stalkStuck || 0) >= S.climb.stuck) { e.stalkStuck = 0; e.stalkPrevD = null;
        if (d <= S.climb.hop) setAct(e, "hop", S.climb.hopTime, { from: { x: e.x, y: e.y }, to: landing(w, p, e) });
        else setAct(e, "climb", S.climb.time);
        break; }
      const reach = e.stalkForm === "ape" && (e.stalkStuck || 0) > 0 ? S.forms.ape.fly : F.range;
      if (a.t <= 0 && d <= reach) {
        const v = w.playerVelocity || { x: 0, y: 0 }, lead = e.stalkForm === "cat" ? F.pounce.warn * .5 : 0;
        const aim = { x: p.x + v.x * lead, y: p.y + v.y * lead };
        if (e.stalkForm === "cat") setAct(e, "pounceWarn", F.pounce.warn, { to: aim });
        else setAct(e, "leapWarn", F.leap.warn, { to: aim });
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
    case "leapWarn": if (a.t <= 0) { const to = landing(w, a.to, e); setAct(e, "leap", F.leap.time, { from: { x: e.x, y: e.y }, to }); } break;
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
      if (a.t <= 0 || dist(e, a.to) < .2 || !moved) setAct(e, "rise", S.forms.pool.rise);
      break;
    }
    case "rise": if (a.t <= 0) { const f = hashSeed(`${e.id}:rise:${e.stalkCycle}`) % 2 ? "cat" : "ape"; e.stalkForm = f; beginForm(e, w, f); } break;
    default: beginForm(e, w, e.stalkForm);
  }
}
