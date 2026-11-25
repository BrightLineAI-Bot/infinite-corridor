import { enemyBodyRadius } from "./combat.ts";
import { liftAt, LIFT_PER_LEVEL } from "./landscape.ts";
import { phaseShielded } from "./affixes.ts";

export const ACTOR_CONTACT = Object.freeze({ playerRadius: .26, step: .16, maxSteps: 256, epsilon: 1e-7 });
// The Briar Stag fight stutter (Tim, 2026-11-22, r1050: "everything just locked up"): in a crowd (Frenzied waves, up to 62
// creatures) bodies pressed against the Wayfarer from different sides blocked every direction, so a dodge (stamina spent,
// i-frames on) covered no ground at all, again and again. When a dodge begins, the bodies the Wayfarer is pressed against
// are noted (touchingBodies): those within `touch` of contact, or, when the Wayfarer is boxed in (no direction of `boxProbe`
// tiles in which bodies and ground let them move `boxFree` tiles, of `boxDirs` tried), those within `boxTouch` of contact.
// A step of that dodge that bodies cut to less than `eaten` of its length is planned again with the noted bodies left out:
// the roll goes through the crush it began in. A body further off or reached later still stops it (a dodge at a foe a step
// away still stops at it), as do walls and lethal ground; a dodge the bodies only shorten or deflect keeps its contact; every
// refusal rule (stamina, held, stunned, cursed) and walking are unchanged.
export const DODGE_CONTACT = Object.freeze({ eaten: .25, touch: .05, boxTouch: .3, boxProbe: .4, boxFree: .1, boxDirs: 8 });
// These controllers own teleportation, roaming, mounting or large-body movement outside ordinary AI.
const SPECIAL = new Set(["voidWalker", "psychicCrystal", "astralWorm", "astralMirage", "lightningGiant", "mountainTurtle", "briarStag", "ashenMoth", "crimsonDragon", "doomChaser"]);
const AIRBORNE_LEGACY = new Set(["cinderWisp"]);
const VEIL_MOTH_ENVELOPE = Object.freeze({ bottom: .35, top: 1.48 });
const GRAVE_LANTERN_ENVELOPE = Object.freeze({ bottom: .33, top: 2.33 });
const LANTERN_SOLID_ATTACKS = new Set(["stillnessCurse", "sigilScatter", "bite", "clawSweep", "longStab", "mortarVolley", "webSpit", "shockwave", "groundRupture", "firefall", "sweepBeam", "blinkStrike", "ramCharge"]);
const LANTERN_VERTICAL_ATTACKS = new Set(["phaseCharge", "leapSlam", "diveBomb"]);
const LANTERN_SOLID_PHASES = new Set(["windup", "active", "strike", "stunned", "recover"]);
const veilMothScale = (e) => Math.max(.25, Math.min(4, Number.isFinite(e?.scale) ? e.scale : 1));
export function materialVeilMoth(e) {
  return e?.kind === "veilMoth" && !e.packKind && !e.aloft
    && !(Number.isFinite(e.hopLift) && Math.abs(e.hopLift) > ACTOR_CONTACT.epsilon)
    && !(Number(e.poiseBreak) > 0);
}
export function materialGraveLantern(e) {
  if (e?.kind !== "graveLantern" || !e.packKind) return false;
  if (e.aloft || e.phasing || (Number.isFinite(e.hopLift) && Math.abs(e.hopLift) > ACTOR_CONTACT.epsilon)) return false;
  const attack = e.pack?.attack, phase = e.pack?.phase;
  if (!attack) return true;
  if (LANTERN_SOLID_ATTACKS.has(attack)) return LANTERN_SOLID_PHASES.has(phase);
  if (!LANTERN_VERTICAL_ATTACKS.has(attack)) return false;
  if (attack === "phaseCharge") return phase === "windup" || phase === "recover";
  if (attack === "leapSlam") return phase === "windup" || phase === "recover";
  // Dive preparation deliberately becomes intangible when its real windup starts; recovery
  // is admitted only after the landing path clears aloft/untargetable in the pack runtime.
  return phase === "recover";
}
export function ordinaryContactEnemy(e) {
  return !!e && Number.isFinite(e.x) && Number.isFinite(e.y) && !e.dead && !(e.hp <= 0)
    && (!e.flying || materialGraveLantern(e)) && !e.aloft && !e.phasing && !e.phases && !e.hidden && !e.mist
    && !e.ambient && !e.passiveBehavior && e.foundryRole !== "passive" && !e.friendly && !e.astralCompanionOf && !e.astralAllyOf
    && !phaseShielded(e) /* a linked-invulnerable creature: the Wayfarer passes through it (affixes.ts PHASE_SHIELD) */
    && !e.retreating && !e.passingBeast && !e.playing && !e.blobRemnant && e.kind !== "npc"
    && !(e.skirmishId && !e.skirmishProvoked) && !e.worldBeast && !e.questingBeast && !e.stalker
    && !e.gatePredator && !e.seaKind && !e.astralOwner && !e.astralMount && !SPECIAL.has(e.kind) && !AIRBORNE_LEGACY.has(e.kind)
    && (e.kind !== "veilMoth" || materialVeilMoth(e))
    && Number.isFinite(enemyBodyRadius(e));
}
export function ordinaryContactPlayer(game) {
  const p = game?.player;
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.hp > 0 && !p.riderShift
    && !game.glide && !game.droneLift && !game.mechBoosting && !game.mountRide?.()
    && !game.save?.boat?.aboard && !game.wading?.();
}
// Canonical conservative support-to-body-top envelopes, in world/tile units at authored
// scale 1. Calibrated offline against current idle/walk native bodies (including bob and
// structural crests, not weapon reach). Runtime physics never imports mesh/presentation code.
// Future body art must fit this policy or explicitly update it; unknown bodies use the bounded
// fallback. These are clearance envelopes, not hitboxes, attack reach or crouch/dodge states.
export const ACTOR_BODY_HEIGHT = Object.freeze({
  player: 1.44, robot: 1.45, powered: 1.44, ember: 1.64, fallback: 3,
  kinds: Object.freeze({
    ashling: 1.45, rootBrute: 1.90, pallidCrawler: .80, hollowMarshal: 2.30,
    ashenHound: .95, coilStalker: 1, glassMite: .65, sparkWarden: 1.75, voidSentinel: 1.40,
    weepingSaint: 1.80, hangedChoir: 2.15, graveLantern: 2.35, mirrorShade: 1.60,
    amalgam: 1.30, gnawingMaw: 1.35, cinderSeraph: 2.15, lumenWraith: 2.15,
    veilSpinner: .90, riftLynx: 1.30, sunderjaw: .95, thunderhorn: 1.20,
    siegeBeetle: 1.30, gloomwisp: 1.35, gloomgorge: 1.55,
    latticeHunter: 1.55, archiveBehemoth: 1.55, riftGrazer: 1.05,
  }),
  foundry: Object.freeze({ quadruped: 1.05, floating: 1.45, segmented: .80,
    tentacled: 1.40, geometric: 1.35, biomechanical: 1.55 }),
});
export function actorContactHeight(body, game) {
  const H = ACTOR_BODY_HEIGHT;
  if (body && (body.isPlayer || body === game?.player)) {
    const save = game?.save;
    if (save?.mech?.active === true && save.mech.mode !== "drone" && !save.boat?.aboard)
      return save.mech.empowered === true ? H.powered : H.robot;
    const form = save?.magicSkills?.active;
    if (form?.id === "ember-form" && form.remaining > 0)
      return H.ember * (1.25 + .05 * Math.max(1, Math.min(3, Number(form.rank) || 1))) * 1.68 / 1.91;
    return H.player;
  }
  // Same authored scale range as current native creature admission; radius does not scale
  // known native meshes. The unknown fallback also covers their capped billboard scale.
  const scale = Math.max(.25, Math.min(4, Number.isFinite(body?.scale) ? body.scale : 1));
  const unit = body?.foundryValidated === true && Object.hasOwn(H.foundry, body.foundryBody)
    ? H.foundry[body.foundryBody] : Object.hasOwn(H.kinds, body?.kind) ? H.kinds[body.kind] : 0;
  return unit ? unit * scale : H.fallback * Math.max(1, scale, Math.min(4, (Number(body?.bodyRadius) || .4) * 2.2));
}
export function actorContactBottom(body) { return materialVeilMoth(body) ? VEIL_MOTH_ENVELOPE.bottom * veilMothScale(body) : materialGraveLantern(body) ? GRAVE_LANTERN_ENVELOPE.bottom * veilMothScale(body) : 0; }
export function actorContactTop(body, game) { return materialVeilMoth(body) ? VEIL_MOTH_ENVELOPE.top * veilMothScale(body) : materialGraveLantern(body) ? GRAVE_LANTERN_ENVELOPE.top * veilMothScale(body) : actorContactHeight(body, game); }
export function actorContactSupport(game, body, x, y, width, phase = null, carrier = null) {
  const ground = liftAt(game.map, width, x, y);
  // Retained platform launch support is physical height over a gap. The ordinary jump arc
  // never grants clearance. Probe scale mirrors commit; later enemy queries use Game's
  // retained launch support because the player's transient airElev is cleared after commit.
  const air = Number.isFinite(body?.airElev) ? body.airElev : game.skyAir;
  const scale = Number.isFinite(body?.airElevScale) ? body.airElevScale : game.skyAirScale || 1;
  if (game.map?.landscape && body?.isPlayer && body.jumping && Number.isFinite(air))
    return Math.max(ground, air * LIFT_PER_LEVEL * scale);
  const platform = body?.isPlayer ? game.actorContactPlatformSupport?.(body, x, y, ground, phase, carrier) : null;
  return Number.isFinite(platform) ? platform : ground;
}

// A cache per Game, never a shared current-world context. Buffers, the candidate list and the
// probe are reused. Enemy movement queries only the player; player movement scans foes once.
const contexts = new WeakMap();
export function actorContactContext(game, subject, dx, dy, pass = null) {
  if (!ordinaryContactPlayer(game) || (subject !== game.player && !ordinaryContactEnemy(subject))) return null;
  let c = contexts.get(game);
  if (!c) {
    c = { game, candidates: [], candidateBottoms: [], candidateTops: [], probe: {}, phaseBefore: {}, phaseAfter: {}, trace: new Float64Array(ACTOR_CONTACT.maxSteps * 8), count: 0, checks: 0, queries: 0, budgetStops: 0, canExit: null };
    c.clip = (x, y, ax, ay) => clipActorSegment(c, x, y, ax, ay);
    contexts.set(game, c);
  }
  c.subject = subject; c.supportSubject = subject; c.width = Math.max(1, Number(game.map.width) || (game.area === "dungeon" ? 24 : 32)); c.map = game.map; c.canExit = null; c.carrier = null; c.phaseBefore ||= {}; c.phaseAfter ||= {}; c.record = false; c.count = 0; c.candidates.length = 0; c.candidateBottoms.length = 0; c.candidateTops.length = 0; c.queries++;
  c.subjectBottom = actorContactBottom(subject); c.subjectTop = actorContactTop(subject, game);
  c.radius = subject === game.player ? ACTOR_CONTACT.playerRadius : enemyBodyRadius(subject);
  const add = (other, radius) => {
    const r = c.radius + radius;
    if (other.x + r < Math.min(subject.x, subject.x + dx) || other.x - r > Math.max(subject.x, subject.x + dx)
      || other.y + r < Math.min(subject.y, subject.y + dy) || other.y - r > Math.max(subject.y, subject.y + dy)) return;
    c.candidates.push(other); c.candidateBottoms.push(actorContactBottom(other)); c.candidateTops.push(actorContactTop(other, game));
  };
  if (subject === game.player) { for (const e of game.enemies || []) if (ordinaryContactEnemy(e) && !(pass && pass.includes(e))) add(e, enemyBodyRadius(e)); }
  else add(game.player, ACTOR_CONTACT.playerRadius);
  return c.candidates.length ? c : null;
}
// DODGE_CONTACT: the ordinary bodies within `slack` of contact with the Wayfarer (or overlapping), into `out` (reused; at
// most the area's creatures, which the actor caps bound).
export function touchingBodies(game, out, slack = DODGE_CONTACT.touch) {
  out.length = 0; const p = game?.player; if (!p || !ordinaryContactPlayer(game)) return out;
  for (const e of game.enemies || []) {
    if (!ordinaryContactEnemy(e)) continue;
    const r = ACTOR_CONTACT.playerRadius + enemyBodyRadius(e) + slack, x = p.x - e.x, y = p.y - e.y;
    if (x * x + y * y <= r * r) out.push(e);
  }
  return out;
}
// DODGE_CONTACT: true when no direction (of `boxDirs`) lets the Wayfarer move `boxFree` tiles: bodies cut the probe short, or
// `open(x, y)` (the ground's footprint test) refuses its end. Bounded: boxDirs body sweeps, run once a dodge press.
export function boxedIn(game, open) {
  const p = game?.player, D = DODGE_CONTACT; if (!p) return false;
  for (let i = 0; i < D.boxDirs; i++) {
    const a = i * Math.PI * 2 / D.boxDirs, dx = Math.cos(a) * D.boxProbe, dy = Math.sin(a) * D.boxProbe;
    const c = actorContactContext(game, p, dx, dy), f = c ? c.clip(p.x, p.y, dx, dy) : 1;
    if (f * D.boxProbe >= D.boxFree && open(p.x + dx * D.boxFree / D.boxProbe, p.y + dy * D.boxFree / D.boxProbe)) return false;
  }
  return true;
}
export function actorContactStats(game) {
  const c = contexts.get(game); return { queries: c?.queries || 0, checks: c?.checks || 0, budgetStops: c?.budgetStops || 0 };
}
// Footprint midpoints share the same (+.5,+.69) offset, so it cancels in pair distances.
// Existing coincident/overlapping saves may move out monotonically, never deeper in. No push,
// relocation, persistent allowance or load-time mutation is required.
function clipActorSegment(c, x, y, dx, dy) {
  const length2 = dx * dx + dy * dy; if (!length2) return 1;
  const before = actorContactSupport(c.game, c.supportSubject, x, y, c.width, c.phaseBefore, c.carrier),
    after = actorContactSupport(c.game, c.supportSubject, x + dx, y + dy, c.width, c.phaseAfter, c.carrier);
  let fraction = 1;
  for (let i=0;i<c.candidates.length;i++) { const other=c.candidates[i];
    c.checks++;
    const level = actorContactSupport(c.game, other, other.x, other.y, c.width);
    // Both ends must remain on the same clear side of the lower body's full envelope.
    // Small steps and ordinary jumps stay solid; genuinely high support can pass above.
    if (Math.min(before, after) + c.subjectBottom >= level + c.candidateTops[i]
      || Math.max(before, after) + c.subjectTop <= level + c.candidateBottoms[i]) continue;
    const radius = c.radius + (other === c.game.player ? ACTOR_CONTACT.playerRadius : enemyBodyRadius(other));
    const x0 = x - other.x, y0 = y - other.y, dot = x0 * dx + y0 * dy, distance2 = x0 * x0 + y0 * y0;
    if (distance2 < radius * radius - ACTOR_CONTACT.epsilon) {
      if (dot < -ACTOR_CONTACT.epsilon) fraction = 0;
      continue;
    }
    if (dot >= 0) continue;
    const discriminant = dot * dot - length2 * (distance2 - radius * radius);
    if (discriminant <= 0) continue;
    const t = (-dot - Math.sqrt(discriminant)) / length2;
    if (t >= -ACTOR_CONTACT.epsilon && t < fraction) fraction = Math.max(0, t - ACTOR_CONTACT.epsilon);
  }
  return fraction;
}
