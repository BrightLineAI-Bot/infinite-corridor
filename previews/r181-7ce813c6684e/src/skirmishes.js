// Skirmishes (release 111): now and then a wild section holds two factions at war with each other — glass mites against
// ashlings, a brute against a hound pack, hamlet wardens against the watchers. They fight each other, not the Wayfarer,
// until the Wayfarer strikes one: that unit (and, for creatures, its nearby kin) turns on the player with its normal AI.
// When a side is wiped out the battle is settled for good (a world flag); creature victors then roam as ordinary foes.
import { rng, pick } from "./random.js?v=r181-7ce813c6684e";
import { LETHAL_KINDS, canStep } from "./landscape.js?v=r181-7ce813c6684e";

export const SKIRMISH_VERSION = 1;
export const SKIRMISH = { chance: 0.07, warChance: 0.25, minDepth: 3, reach: 1.2, cooldown: 1.4, damageScale: 0.35, speed: 1.5, provokeRadius: 4, spread: 4 };
// Each matchup: two sides with a kind, a head-count for a skirmish and for a full war-band clash, and the line shown on arrival.
export const SKIRMISH_MATCHUPS = [
  { id: "mites-ashlings", a: { kind: "glassMite", label: "glass mites", count: 4, war: 7 }, b: { kind: "ashling", label: "ashlings", count: 3, war: 6 } },
  { id: "brute-hounds", a: { kind: "rootBrute", label: "a root brute", count: 1, war: 3 }, b: { kind: "ashenHound", label: "ashen hounds", count: 3, war: 6 } },
  { id: "moths-wisps", a: { kind: "veilMoth", label: "veil moths", count: 3, war: 5 }, b: { kind: "cinderWisp", label: "cinder wisps", count: 3, war: 5 } },
  { id: "stalkers-mites", a: { kind: "coilStalker", label: "coil stalkers", count: 2, war: 4 }, b: { kind: "glassMite", label: "glass mites", count: 4, war: 7 } },
  { id: "wardens-watchers", a: { kind: "militia", label: "hamlet wardens", count: 3, war: 6, friendly: true }, b: { kind: "voidSentinel", label: "watchers", count: 1, war: 3 } },
  { id: "wardens-overseers", a: { kind: "militia", label: "hamlet wardens", count: 3, war: 5, friendly: true }, b: { kind: "sparkWarden", label: "overseers", count: 2, war: 4 } },
  { id: "wardens-brutes", a: { kind: "militia", label: "hamlet wardens", count: 3, war: 6, friendly: true }, b: { kind: "rootBrute", label: "root brutes", count: 1, war: 3 } },
];
// Wardens are people: sturdy, never rewarding to kill, and only hostile to a Wayfarer who strikes them.
export const MILITIA = { hp: 40, damage: 6 };

export function skirmishPlan(seed, rx, ry) {
  if (Math.abs(rx) + Math.abs(ry) < SKIRMISH.minDepth) return null;
  const r = rng(`${seed}:skirmish:v${SKIRMISH_VERSION}:${rx}:${ry}`);
  if (r() >= SKIRMISH.chance) return null;
  const m = pick(r, SKIRMISH_MATCHUPS), war = r() < SKIRMISH.warChance;
  return { id: `skirmish:v${SKIRMISH_VERSION}:${rx},${ry}`, matchup: m.id, war, a: m.a, b: m.b, text: war ? `War-bands clash here: ${m.a.label} against ${m.b.label}.` : `Ahead, ${m.a.label} and ${m.b.label} are fighting.` };
}

const open = (map, x, y) => { const t = map.tiles[y * 32 + x]; return !!t && !t.blocked && !t.structure && !LETHAL_KINDS.has(t.kind) && t.kind !== "shallows"; };
// Adds the two sides to an overworld map's spawns. Returns the plan or null.
export function addSkirmish(map, seed, rx, ry, save) {
  if (!map || map.settlement || map.tiles?.length !== 1024) return null;
  const plan = skirmishPlan(seed, rx, ry);
  if (!plan || save?.worldFlags?.[plan.id]) return null;
  const tiles = map.tiles.filter((t) => t.x > 6 && t.y > 6 && t.x < 25 && t.y < 25 && open(map, t.x, t.y)).sort((a, b) => Math.hypot(a.x - 16, a.y - 16) - Math.hypot(b.x - 16, b.y - 16));
  const centre = tiles[0];
  if (!centre) return null;
  // The battlefield: open, level ground connected to the centre, so both sides can always reach each other.
  const field = [centre], seen = new Set([`${centre.x},${centre.y}`]);
  for (let i = 0; i < field.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = field[i].x + dx, y = field[i].y + dy, k = `${x},${y}`, t = map.tiles[y * 32 + x];
    if (seen.has(k) || x < 3 || y < 3 || x > 28 || y > 28 || Math.abs(x - centre.x) > 9 || Math.abs(y - centre.y) > 7 || !open(map, x, y) || (t.elev || 0) !== (centre.elev || 0)) continue;
    seen.add(k); field.push(t);
  }
  map.skirmishField = seen;
  const taken = new Set(), spawns = [];
  const place = (side, def, dir) => {
    const n = plan.war ? def.war : def.count;
    const near = field.filter((t) => !taken.has(`${t.x},${t.y}`))
      .sort((p, q) => Math.hypot(p.x - (centre.x + dir * SKIRMISH.spread), p.y - centre.y) - Math.hypot(q.x - (centre.x + dir * SKIRMISH.spread), q.y - centre.y));
    for (let i = 0; i < n && near.length; i++) {
      const t = near.shift(); 
      taken.add(`${t.x},${t.y}`);
      spawns.push({ id: `${plan.id}:${side}:${i}`, kind: def.kind, x: t.x, y: t.y, skirmishId: plan.id, skirmishSide: side, skirmishFriendly: !!def.friendly, noRewards: !!def.friendly, traits: [] });
    }
  };
  place("a", plan.a, -1); place("b", plan.b, 1);
  if (!spawns.some((s) => s.skirmishSide === "a") || !spawns.some((s) => s.skirmishSide === "b")) return null;
  // Clear ordinary foes from the battlefield so the clash reads cleanly.
  map.enemySpawns = (map.enemySpawns || []).filter((e) => e.ambient || Math.hypot(e.x - centre.x, e.y - centre.y) > 8).concat(spawns);
  map.skirmish = { ...plan, x: centre.x, y: centre.y };
  return map.skirmish;
}

// Combatant fields for a skirmish unit (applied after createCombatant).
export function skirmishFields(spawn) {
  const f = { skirmishId: spawn.skirmishId, skirmishSide: spawn.skirmishSide, skirmishFriendly: !!spawn.skirmishFriendly, skirmishProvoked: false, skirmishCd: 0 };
  if (spawn.kind === "militia") Object.assign(f, { hp: MILITIA.hp, maxHp: MILITIA.hp, damage: MILITIA.damage, range: 0, noRewards: true });
  return f;
}

// One tick for an unprovoked skirmish unit. `units` is every enemy on the map. `hooks.kill(victim)` and
// `hooks.settled(winnerSide)` report outcomes. Returns true while the unit is still under skirmish control.
export function updateSkirmisher(e, units, map, dt, hooks = {}) {
  if (e.dead || e.skirmishProvoked) return false;
  e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt); e.recoil = Math.max(0, (e.recoil || 0) - dt);
  // A hit we did not deal (the player's) provokes this unit; creature kin nearby join in.
  if (Number.isFinite(e.skirmishHp) && e.hp < e.skirmishHp) { provoke(e, units); return false; }
  e.skirmishHp = e.hp;
  // Creatures only fight foes still in the skirmish; wardens keep fighting creatures that have turned on the Wayfarer.
  const foes = units.filter((q) => !q.dead && q.skirmishId === e.skirmishId && q.skirmishSide !== e.skirmishSide && (e.skirmishFriendly || !q.skirmishProvoked));
  // A creature that cannot find a way to its foes gives up the fight and roams as an ordinary foe.
  if (!e.skirmishFriendly && (e.skirmishStuck || 0) > 6) { e.skirmishProvoked = true; return false; }
  if (!foes.length) { settle(e, units, hooks); return !e.skirmishProvoked; }
  let foe = foes[0], best = Infinity;
  for (const q of foes) { const d = Math.hypot(q.x - e.x, q.y - e.y); if (d < best) { best = d; foe = q; } }
  const reach = e.range > 0 ? Math.min(4, e.range * .7) : SKIRMISH.reach, ai = (e.ai ||= {});
  ai.facing = Math.abs(foe.x - e.x) > Math.abs(foe.y - e.y) ? (foe.x > e.x ? "right" : "left") : (foe.y > e.y ? "down" : "up");
  e.skirmishCd = Math.max(0, (e.skirmishCd || 0) - dt);
  const stuck = (e.skirmishStuck || 0) > 1.5 && best < 2.5;
  if (best > reach && !stuck) {
    const px = e.x, py = e.y;
    const step = Math.min(best - reach * .8, SKIRMISH.speed * (e.speedMultiplier || 1) * dt), nx = e.x + (foe.x - e.x) / best * step, ny = e.y + (foe.y - e.y) / best * step;
    const ok = (x, y) => { const tx = Math.round(x), ty = Math.round(y); return open(map, tx, ty) && canStep(e, map, 32, Math.round(e.x), Math.round(e.y), tx, ty); };
    // Straight at the foe; failing that, slide along one axis; failing that, sidestep around the obstacle.
    if (ok(nx, ny)) { e.x = nx; e.y = ny; }
    else if (ok(nx, e.y)) e.x = nx; else if (ok(e.x, ny)) e.y = ny;
    else { const side = (e.skirmishSideStep ||= e.id.length % 2 ? 1 : -1), sx = e.x - (foe.y - e.y) / best * step * side, sy = e.y + (foe.x - e.x) / best * step * side; if (ok(sx, sy)) { e.x = sx; e.y = sy; } else e.skirmishSideStep = -side; }
    // Kin don't stack on one spot: ease apart from any ally standing too close.
    for (const q of units) if (q !== e && !q.dead && q.skirmishId === e.skirmishId && q.skirmishSide === e.skirmishSide) { const d = Math.hypot(e.x - q.x, e.y - q.y); if (d < .55) { const ax = e.x + (d ? (e.x - q.x) / d : .7) * .04, ay = e.y + (d ? (e.y - q.y) / d : .7) * .04; if (ok(ax, ay)) { e.x = ax; e.y = ay; } } }
    e.skirmishStuck = Math.hypot(e.x - px, e.y - py) < step * .2 ? (e.skirmishStuck || 0) + dt : 0;
  } else if (e.skirmishCd <= 0) {
    e.skirmishCd = SKIRMISH.cooldown * (e.attackCooldownScale || 1);
    e.recoil = .15; foe.hitFlash = .18;
    foe.hp -= Math.max(1, Math.round((e.damage || 4) * SKIRMISH.damageScale));
    if (Number.isFinite(foe.skirmishHp)) foe.skirmishHp = foe.hp;
    if (foe.hp <= 0) { foe.dead = true; foe.rewarded = true; hooks.kill?.(foe, e); }
  }
  return true;
}
function provoke(e, units) {
  e.skirmishProvoked = true; e.aggro = true;
  if (e.skirmishFriendly) return;
  for (const q of units) if (!q.dead && q.skirmishId === e.skirmishId && q.skirmishSide === e.skirmishSide && Math.hypot(q.x - e.x, q.y - e.y) <= SKIRMISH.provokeRadius) { q.skirmishProvoked = true; q.aggro = true; }
}
function settle(e, units, hooks) {
  const id = e.skirmishId, survivors = units.filter((q) => !q.dead && q.skirmishId === id);
  if (!units.some((q) => q.skirmishId === id && q.skirmishSettled)) { for (const q of units) if (q.skirmishId === id) q.skirmishSettled = true; hooks.settled?.(e.skirmishSide, survivors); }
  // Creature victors go back to being ordinary foes; wardens stand down where they are.
  if (!e.skirmishFriendly) e.skirmishProvoked = true;
}
