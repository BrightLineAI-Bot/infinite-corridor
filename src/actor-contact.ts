import { enemyBodyRadius } from "./combat.ts";
import { interiorTerrain, interiorTileLevel, tileUnder } from "./landscape.ts";

export const ACTOR_CONTACT = Object.freeze({ playerRadius: .26, step: .16, maxSteps: 256, supportGap: 1, epsilon: 1e-7 });
// These controllers own teleportation, roaming, mounting or large-body movement outside ordinary AI.
const SPECIAL = new Set(["voidWalker", "psychicCrystal", "astralWorm", "astralMirage", "lightningGiant", "mountainTurtle", "briarStag", "ashenMoth", "crimsonDragon", "doomChaser"]);
const AIRBORNE_LEGACY = new Set(["veilMoth", "cinderWisp"]);
export function ordinaryContactEnemy(e) {
  return !!e && Number.isFinite(e.x) && Number.isFinite(e.y) && !e.dead && !(e.hp <= 0)
    && !e.flying && !e.aloft && !e.phasing && !e.phases && !e.hidden && !e.mist
    && !e.ambient && !e.passiveBehavior && e.foundryRole !== "passive" && !e.friendly && !e.astralCompanionOf && !e.astralAllyOf
    && !e.retreating && !e.passingBeast && !e.playing && !e.blobRemnant && e.kind !== "npc"
    && !(e.skirmishId && !e.skirmishProvoked) && !e.worldBeast && !e.questingBeast && !e.stalker
    && !e.gatePredator && !e.seaKind && !e.astralOwner && !e.astralMount && !SPECIAL.has(e.kind) && !AIRBORNE_LEGACY.has(e.kind)
    && Number.isFinite(enemyBodyRadius(e));
}
export function ordinaryContactPlayer(game) {
  const p = game?.player;
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.hp > 0 && !p.riderShift
    && !game.glide && !game.droneLift && !game.mechBoosting && !game.mountRide?.()
    && !game.save?.boat?.aboard && !game.wading?.();
}
function support(map, width, x, y, body) {
  if (!map?.landscape) return 0;
  const tile = tileUnder(map, width, x, y);
  const ground = interiorTerrain(map) ? interiorTileLevel(tile, x + .5, y + .75) : (tile?.elev || 0) - (tile?.slope ? .5 : 0);
  // A platform jump retains a real launch level over a lower gap. Ordinary visual hops
  // do not have airElev and never become a body-phasing capability.
  return body?.isPlayer && body.jumping && Number.isFinite(body.airElev) ? Math.max(ground, body.airElev) : ground;
}

// A cache per Game, never a shared current-world context. Buffers, the candidate list and the
// probe are reused. Enemy movement queries only the player; player movement scans foes once.
const contexts = new WeakMap();
export function actorContactContext(game, subject, dx, dy) {
  if (!ordinaryContactPlayer(game) || (subject !== game.player && !ordinaryContactEnemy(subject))) return null;
  let c = contexts.get(game);
  if (!c) {
    c = { game, candidates: [], probe: {}, trace: new Float64Array(ACTOR_CONTACT.maxSteps * 8), count: 0, checks: 0, queries: 0, budgetStops: 0, canExit: null };
    c.clip = (x, y, ax, ay) => clipActorSegment(c, x, y, ax, ay);
    contexts.set(game, c);
  }
  c.subject = subject; c.supportSubject = subject; c.width = Math.max(1, Number(game.map.width) || (game.area === "dungeon" ? 24 : 32)); c.map = game.map; c.canExit = null; c.record = false; c.count = 0; c.candidates.length = 0; c.queries++;
  c.radius = subject === game.player ? ACTOR_CONTACT.playerRadius : enemyBodyRadius(subject);
  const add = (other, radius) => {
    const r = c.radius + radius;
    if (other.x + r < Math.min(subject.x, subject.x + dx) || other.x - r > Math.max(subject.x, subject.x + dx)
      || other.y + r < Math.min(subject.y, subject.y + dy) || other.y - r > Math.max(subject.y, subject.y + dy)) return;
    c.candidates.push(other);
  };
  if (subject === game.player) { for (const e of game.enemies || []) if (ordinaryContactEnemy(e)) add(e, enemyBodyRadius(e)); }
  else add(game.player, ACTOR_CONTACT.playerRadius);
  return c.candidates.length ? c : null;
}
export function actorContactStats(game) {
  const c = contexts.get(game); return { queries: c?.queries || 0, checks: c?.checks || 0, budgetStops: c?.budgetStops || 0 };
}
// Footprint midpoints share the same (+.5,+.69) offset, so it cancels in pair distances.
// Existing coincident/overlapping saves may move out monotonically, never deeper in. No push,
// relocation, persistent allowance or load-time mutation is required.
function clipActorSegment(c, x, y, dx, dy) {
  const length2 = dx * dx + dy * dy; if (!length2) return 1;
  const before = support(c.map, c.width, x, y, c.supportSubject), after = support(c.map, c.width, x + dx, y + dy, c.supportSubject);
  let fraction = 1;
  for (const other of c.candidates) {
    c.checks++;
    const level = support(c.map, c.width, other.x, other.y, other);
    if (Math.min(Math.abs(before - level), Math.abs(after - level)) >= ACTOR_CONTACT.supportGap) continue;
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
