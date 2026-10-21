// Isolated Astral Worm riding adapter. Numbers are provisional, not owner-specified balance.
// No merged HP, damage interception, immunity, reward writes, timers or terrain assumptions.
export const ASTRAL_MOUNT = Object.freeze({ version: 1, mountReach: 2.25, knockoffHpShare: .2, renderLift: .3, griffinLift: .45, poolLift: .18, flightLift: .8 });
const point = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const alive = e => !!e && !e.dead && Number.isFinite(e.hp) && e.hp > 0;
const suspended = host => !!(host?.paused || host?.unloaded);
const departing = e => !!(e?.retreating || e?.fleeTo || e?.astral?.terminated);
const ownerOf = (rider, host) => host?.findOwner?.(rider.astralMount.ownerId) || null;

// Explicit host choice, not a random mount decision. One reserved Walker per encounter is the
// host's responsibility. An actor can never be rebound while mounted or awaiting safe landing.
export function mountAstralWalker(owner, rider, host = {}) {
  if (host.alignment !== 'hostile' || rider?.astralAllyOf || suspended(host) || !alive(owner) || !alive(rider) || !point(owner) || !point(rider) ||
      owner.kind !== 'astralWorm' || rider.kind !== 'voidWalker' || !owner.id || !rider.id || owner.id === rider.id ||
      departing(owner) || departing(rider) || ['mounted', 'landing'].includes(rider.astralMount?.status) ||
      !Number.isFinite(rider.maxHp) || rider.maxHp <= 0 || Math.hypot(owner.x-rider.x, owner.y-rider.y) > ASTRAL_MOUNT.mountReach) return false;
  if (host.canMount && !host.canMount(owner, rider)) return false;
  rider.astralMount = { v: ASTRAL_MOUNT.version, ownerId: owner.id, status: 'mounted', damageTaken: 0,
    knockoffDamage: rider.maxHp * ASTRAL_MOUNT.knockoffHpShare, reason: null, form: owner.astral?.form || 'worm', ownerScale: Number.isFinite(owner.scale) && owner.scale > 0 ? owner.scale : 1 };
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
  const owner = ownerOf(rider, host);
  const reason = !owner ? 'owner-missing' : !alive(owner) ? 'owner-dead' : departing(owner) ? 'owner-retreat' :
    departing(rider) ? 'rider-retreat' : !point(owner) ? 'owner-position-invalid' : null;
  if (reason) { dismountAstralWalker(rider, reason, host); return false; }
  rider.x = owner.x; rider.y = owner.y; state.form = owner.astral?.form || 'worm';
  state.ownerScale = Number.isFinite(owner.scale) && owner.scale > 0 ? owner.scale : 1;
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
  return { ownerId: state.ownerId, form: state.form, riding: state.status === 'mounted',
    pendingLanding: state.status === 'landing', aboveWater: true, lift: state.form === 'pool' ? ASTRAL_MOUNT.poolLift : state.form === 'griffin' ? ASTRAL_MOUNT.griffinLift :
      ASTRAL_MOUNT.renderLift + (state.form === 'flight' ? ASTRAL_MOUNT.flightLift * (state.ownerScale || 1) : 0) };
}
