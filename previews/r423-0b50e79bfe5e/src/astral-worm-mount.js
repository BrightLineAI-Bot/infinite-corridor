import { astralActorScale } from "./astral-worm.js?v=r423-0b50e79bfe5e";
// Isolated Astral Worm riding adapter. Numbers are provisional, not owner-specified balance.
// No merged HP, damage interception, immunity, reward writes, timers or terrain assumptions.
export const ASTRAL_MOUNT = Object.freeze({ version: 1, mountReach: 2.25, knockoffHpShare: .2, renderLift: .3, griffinLift: .45, poolLift: .18, flightLift: .8 });
const point = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const alive = e => !!e && !e.dead && Number.isFinite(e.hp) && e.hp > 0;
const suspended = host => !!(host?.paused || host?.unloaded);
const departing = e => !!(e?.retreating || e?.fleeTo || e?.astral?.terminated);
const ownerOf = (rider, host) => host?.findOwner?.(rider.astralMount.ownerId) || null;

// Owner-described boarding (2026-10-21): the Walker throws his saddle disk at the (possibly moving) Worm,
// it latches on and its violet pillar rises, then he phases out in violet light and phases in standing on
// it. Timings are presentation data; the rider stays an ordinary targetable actor on the ground until he
// phases in, never moves himself meanwhile, and the disk does no damage.
export const ASTRAL_BOARDING = Object.freeze({ reach: 8, throwTime: .6, throwArc: 1.1, diskHeight: .55, pillarTime: .45, phaseOutTime: .3, phaseInTime: .3 });
const BOARDING_PHASES = ['throw', 'pillar', 'phaseOut', 'phaseIn'];
const boardingTime = phase => ({ throw: ASTRAL_BOARDING.throwTime, pillar: ASTRAL_BOARDING.pillarTime, phaseOut: ASTRAL_BOARDING.phaseOutTime, phaseIn: ASTRAL_BOARDING.phaseInTime })[phase];
function canBind(owner, rider, host, reach) {
  if (host.alignment !== 'hostile' || rider?.astralAllyOf || suspended(host) || !alive(owner) || !alive(rider) || !point(owner) || !point(rider) ||
      owner.kind !== 'astralWorm' || rider.kind !== 'voidWalker' || !owner.id || !rider.id || owner.id === rider.id ||
      departing(owner) || departing(rider) || ['mounted', 'landing', 'boarding'].includes(rider.astralMount?.status) ||
      !Number.isFinite(rider.maxHp) || rider.maxHp <= 0 || Math.hypot(owner.x-rider.x, owner.y-rider.y) > reach) return false;
  return !host.canMount || host.canMount(owner, rider);
}
function mountedState(owner, rider) {
  return { v: ASTRAL_MOUNT.version, ownerId: owner.id, status: 'mounted', damageTaken: 0,
    knockoffDamage: rider.maxHp * ASTRAL_MOUNT.knockoffHpShare, reason: null, form: owner.astral?.form || 'worm', flightLiftExtra: Math.max(0,Number(owner.astral?.flightLiftExtra)||0), ownerScale: astralActorScale(owner) };
}
export function beginAstralBoarding(owner, rider, host = {}) {
  if (!canBind(owner, rider, host, ASTRAL_BOARDING.reach)) return false;
  rider.astralMount = { ...mountedState(owner, rider), status: 'boarding', phase: 'throw', t: 0, from: { x: rider.x, y: rider.y },
    disk: { x: rider.x, y: rider.y, h: ASTRAL_BOARDING.diskHeight }, seat: { x: owner.x, y: owner.y } };
  return true;
}
function endBoarding(state) { for (const k of ['phase', 't', 'from', 'disk', 'seat']) delete state[k]; }
// Active ticks only; pause/unload are exact no-ops. Returns true on the tick he arrives on the plinth.
export function tickAstralBoarding(rider, dt, host = {}) {
  const state = rider?.astralMount;
  if (suspended(host) || state?.status !== 'boarding' || !(dt > 0)) return false;
  const owner = ownerOf(rider, host);
  if (!alive(rider) || !owner || !alive(owner) || departing(owner) || departing(rider) || !point(owner)) { dismountAstralWalker(rider, 'boarding-cancelled', host); return false; }
  state.form = owner.astral?.form || 'worm'; state.flightLiftExtra = Math.max(0,Number(owner.astral?.flightLiftExtra)||0); state.ownerScale = astralActorScale(owner);
  state.seat = { x: owner.x, y: owner.y };
  if (!BOARDING_PHASES.includes(state.phase) || !Number.isFinite(state.t)) { state.phase = 'throw'; state.t = 0; }
  state.t += dt;
  while (state.t >= boardingTime(state.phase)) {
    state.t -= boardingTime(state.phase);
    const next = BOARDING_PHASES[BOARDING_PHASES.indexOf(state.phase) + 1];
    if (!next) { rider.x = owner.x; rider.y = owner.y; state.status = 'mounted'; endBoarding(state); return true; }
    state.phase = next;
  }
  // The disk homes on the Worm's current position, so a moving target is still struck.
  const k = state.phase === 'throw' ? state.t / ASTRAL_BOARDING.throwTime : 1, from = point(state.from) ? state.from : { x: rider.x, y: rider.y };
  state.disk = { x: from.x + (owner.x - from.x) * k, y: from.y + (owner.y - from.y) * k, h: ASTRAL_BOARDING.diskHeight + ASTRAL_BOARDING.throwArc * Math.sin(Math.PI * k) };
  if (state.phase === 'phaseIn') { rider.x = owner.x; rider.y = owner.y; }
  return false;
}

// Owner rule 2026-10-21: once on, a hostile rider stays on through every form and through the player's death.
// Every ASTRAL_RIDER.decideEvery riding seconds he picks at random (deterministic per rider and decision): stay on,
// get off and fight on foot, or leave the fight. He never takes over the fight; the host acts on 'dismount'/'leave'.
export const ASTRAL_RIDER = Object.freeze({ decideEvery: 12, stay: .6, dismount: .25, leave: .15 });
export function tickAstralRiderChoice(rider, dt, roll, host = {}) {
  const state = rider?.astralMount;
  if (suspended(host) || state?.status !== 'mounted' || state.ridingAway || rider.astralAllyOf || !(dt > 0) || typeof roll !== 'function') return 'stay';
  state.decideClock = (Number(state.decideClock) || 0) + dt;
  if (state.decideClock < ASTRAL_RIDER.decideEvery) return 'stay';
  state.decideClock -= ASTRAL_RIDER.decideEvery; state.decisions = (Number(state.decisions) || 0) + 1;
  const r = roll(state.decisions);
  return r < ASTRAL_RIDER.stay ? 'stay' : r < ASTRAL_RIDER.stay + ASTRAL_RIDER.dismount ? 'dismount' : 'leave';
}

// A Walker that joined the fight on foot keeps fighting, even after the Worm dies or retreats, until he is killed,
// the player's tries run out, or he decides to leave (checked every ASTRAL_FIGHTER.decideEvery seconds).
export const ASTRAL_FIGHTER = Object.freeze({ decideEvery: 15, leave: .15 });
export function tickAstralFighterChoice(active, dt, roll) {
  if (!active?.astralJoined || active.astralLeave || active.retreat || !(dt > 0) || typeof roll !== 'function') return false;
  active.fightClock = (Number(active.fightClock) || 0) + dt;
  if (active.fightClock < ASTRAL_FIGHTER.decideEvery) return false;
  active.fightClock -= ASTRAL_FIGHTER.decideEvery; active.fightDecisions = (Number(active.fightDecisions) || 0) + 1;
  return roll(active.fightDecisions) < ASTRAL_FIGHTER.leave;
}

// Explicit host choice, not a random mount decision. One reserved Walker per encounter is the
// host's responsibility. An actor can never be rebound while mounted or awaiting safe landing.
export function mountAstralWalker(owner, rider, host = {}) {
  if (!canBind(owner, rider, host, ASTRAL_MOUNT.mountReach)) return false;
  rider.astralMount = mountedState(owner, rider);
  rider.x = owner.x; rider.y = owner.y;
  return true;
}

function land(rider, owner, host) {
  const state = rider.astralMount;
  // A candidate is never sufficient: the host must validate this rider's entire footprint,
  // terrain hazards, elevation and above-water placement at the current simulation instant.
  const candidate = host?.findLanding?.(rider, owner, state.reason);
  if (!point(candidate) || typeof host?.canLand !== 'function' || !host.canLand(rider, candidate)) return false;
  rider.x = candidate.x; rider.y = candidate.y; state.status = 'dismounted';
  return true;
}

// No safe landing => detached, targetable pending-landing state, NOT a guess at a dry tile.
// Host holds locomotion/displacement while pending, can keep ordinary attacks active, and calls
// sync again on active ticks. Do not restore ground locomotion or remove surface support early.
export function dismountAstralWalker(rider, reason = 'voluntary', host = {}) {
  const state = rider?.astralMount;
  if (suspended(host) || !state || state.status === 'dismounted') return false;
  // Boarding is cancelled where he stands, unless he has already phased onto the plinth.
  if (state.status === 'boarding') {
    if (state.phase !== 'phaseIn') { endBoarding(state); state.status = 'dismounted'; state.reason = reason; return true; }
    endBoarding(state); state.status = 'mounted';
  }
  if (state.status === 'mounted') { state.status = 'landing'; state.reason = reason; }
  if (!alive(rider)) { state.status = 'dismounted'; state.reason = 'rider-dead'; return true; }
  return land(rider, ownerOf(rider, host), host);
}

// Call AFTER authoritative owner motion, and after each Walker AI pass if it can displace itself.
// The host must suppress mounted self-movement/teleports but may keep its independent attack kit.
// Called without dt: riding has no expiry, and pause/unload must be exact no-ops.
export function syncAstralMount(rider, host = {}) {
  if (suspended(host) || !rider?.astralMount) return false;
  const state = rider.astralMount;
  if (state.status === 'dismounted') return false;
  if (!alive(rider)) { dismountAstralWalker(rider, 'rider-dead', host); return false; }
  if (state.status === 'landing') { land(rider, ownerOf(rider, host), host); return false; }
  if (state.status === 'boarding') { const owner = ownerOf(rider, host); if (state.phase === 'phaseIn' && alive(owner) && point(owner)) { rider.x = owner.x; rider.y = owner.y; } return false; }
  const owner = ownerOf(rider, host);
  // Owner rule 2026-10-21: a rider stays on a retreating Worm and rides it home; the host removes both on arrival
  // or when the Worm leaves the section. He neither attacks nor can be hit while riding it away.
  const ridingAway = alive(owner) && point(owner) && departing(owner) && !departing(rider);
  const reason = !owner ? 'owner-missing' : !alive(owner) ? 'owner-dead' : ridingAway ? null : departing(owner) ? 'owner-retreat' :
    departing(rider) ? 'rider-retreat' : !point(owner) ? 'owner-position-invalid' : null;
  if (reason) { dismountAstralWalker(rider, reason, host); return false; }
  if (ridingAway) { state.ridingAway = true; rider.untargetable = true; }
  rider.x = owner.x; rider.y = owner.y; state.form = owner.astral?.form || 'worm';
  state.flightLiftExtra = Math.max(0,Number(owner.astral?.flightLiftExtra)||0);
  state.ownerScale = astralActorScale(owner);
  return true;
}

// Call ONCE per resolved PLAYER hit with actual HP removed, AFTER ordinary armor, evasion and hit
// filtering. The authoritative host supplies source.playerInflicted, never an attack label guess.
// Never pass raw requested damage. This function never changes anyone's HP.
// Damage to the worm alone does not knock the rider off. Pierce/splash enumerate BOTH ordinary
// actors independently; do not replace either hitbox, mark either untargetable, or deduplicate by pair.
export function recordAstralRiderDamage(rider, actualDamage, source, host = {}) {
  const state = rider?.astralMount;
  if (source?.playerInflicted !== true || suspended(host) || state?.status !== 'mounted' || !Number.isFinite(actualDamage) || actualDamage <= 0) return false;
  state.damageTaken += actualDamage;
  if (!alive(rider)) return dismountAstralWalker(rider, 'rider-dead', host);
  if (state.damageTaken >= state.knockoffDamage) { dismountAstralWalker(rider, 'damage', host); return true; }
  return false;
}

// Render-only vertical offset. The collision position remains the owner's ground-plane position,
// so simultaneous piercing/area hits remain eligible for both ordinary independent actors.
export function astralMountPresentation(rider) {
  const state = rider?.astralMount;
  if (!state || state.status === 'dismounted') return null;
  const seatLift = state.form === 'pool' ? ASTRAL_MOUNT.poolLift : state.form === 'griffin' ? ASTRAL_MOUNT.griffinLift :
    ASTRAL_MOUNT.renderLift + (state.form === 'flight' ? ASTRAL_MOUNT.flightLift * (state.ownerScale || 1) + Math.max(0,Number(state.flightLiftExtra)||0) : 0);
  if (state.status === 'boarding') {
    // Until he phases in he stands on the ground (no lift); the disk, pillar and seat carry their own positions.
    const onSeat = state.phase === 'phaseIn', k = Math.max(0, Math.min(1, (Number(state.t) || 0) / (boardingTime(state.phase) || 1)));
    return { ownerId: state.ownerId, form: state.form, riding: onSeat, pendingLanding: false, aboveWater: onSeat, lift: onSeat ? seatLift : 0,
      boarding: { phase: state.phase, k, from: state.from, disk: state.disk, seat: state.seat, seatLift } };
  }
  return { ownerId: state.ownerId, form: state.form, riding: state.status === 'mounted',
    pendingLanding: state.status === 'landing', aboveWater: true, lift: seatLift };
}
