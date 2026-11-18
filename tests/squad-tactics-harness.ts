// A headless fairness harness for squad tactics (src/squad-tactics.ts), on top of the release-975 harness
// (tests/enemy-behaviour-harness.ts): squad compositions that mix the families, region levels (the game's own regional
// scaling), a Wayfarer bot that also faces its target, records its dodges (`dodgeUntil`) and drinks now and then, and a
// stand-in-place run. `tactics: false` keeps the release-975 squad board but switches the tactics layer off (the baseline).
// Deterministic: every roll is hashed. The Wayfarer's hurt window is the game's (squad-tactics.ts tacticsHurtWindow).
import { flatWorld, spawn, frame, BUILDS, DODGE_IFRAMES, DODGE_COST, STAMINA_REGEN, HURT_IFRAMES } from './enemy-behaviour-harness.ts';
import { tacticsHurtWindow } from '../src/squad-tactics.ts';
import { regionalScale } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';
import { hashSeed } from '../src/random.ts';
import { behaviourProfile } from '../src/enemy-behaviour.ts';

// [kind, dx, dy] round the Wayfarer.
export const COMPOSITIONS = {
  mixed: [['riftLynx', 3, 0], ['riftLynx', -3, 1], ['crystalCrab', 0, 3], ['crystalCrab', 2, -3], ['mirrorShade', -3, -2], ['thunderhorn', 4, 4], ['lumenWraith', -5, 3], ['veilSpinner', 5, -1], ['ashenHound', -4, 0], ['rootBrute', 0, -5]],
  swarm: Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = 3 + (i % 3); return [i % 4 === 3 ? 'ashling' : i % 5 === 4 ? 'glassMite' : 'pallidCrawler', Math.cos(a) * r, Math.sin(a) * r]; }),
  shieldwall: [['thunderhorn', 3, 0], ['mirrorShade', 3, 1.5], ['hollowMiner', 3, -1.5], ['lumenWraith', 6, 1], ['siegeBeetle', 6.5, -1], ['sparkWarden', 6, 2.5], ['hangedChoir', 5.5, -2.5]],
  hunters: [['riftLynx', 4, 0], ['riftLynx', 4, 2], ['riftLynx', 4, -2], ['ashenHound', -4, 1], ['ashenHound', -4, -1], ['crystalCrab', 0, 4], ['crystalCrab', 0, -4], ['coilStalker', 3, 3]],
  legacy: [['ashling', 3, 0], ['ashling', 3, 1], ['ashling', -3, 0], ['glassMite', 0, 3], ['glassMite', 0, -3], ['rootBrute', 4, 2], ['hollowMarshal', -4, 2], ['sparkWarden', 5, -3], ['cinderWisp', -5, -3]],
};
// Region levels: a ring of the world (the game's regionalScale) with a build that belongs there and its health.
export const LEVELS = [{ ring: 0, build: 'early', hp: 160 }, { ring: 40, build: 'mid', hp: 360 }, { ring: 120, build: 'late', hp: 800 }];

export function squadWorld(comp, ring, { tactics = true, shift = 0 } = {}) {
  const w = flatWorld(), P = w.player; P.x += shift; P.y += shift * .5; P.maxHp = P.hp;
  if (!tactics && w.squad) w.squad.tac = null;
  // the game's hurt window (game.ts packHurt and the older creatures' blow), with the squad's combo window
  w.hurt = (source, amount, opts = {}) => { if (source?.illusion) return false; if (opts.jumpable && w.jumping) return false; if (w.now <= w.player.inv) return false; w.hurts.push({ amount, source: opts.source, kind: source?.kind, id: source?.id, at: w.now }); w.player.hp -= amount; w.player.inv = w.now + tacticsHurtWindow(source, w.now, opts.beam ? 320 : HURT_IFRAMES, w.player); return true; };
  const q = regionalThreat(ring, 0);
  const c = Math.cos(shift * 2), s = Math.sin(shift * 2); // `shift` also turns the whole group round the Wayfarer (a different approach)
  for (const [kind, dx, dy] of COMPOSITIONS[comp]) { const e = spawn(w, kind, P.x + dx * c - dy * s, P.y + dx * s + dy * c, { aggro: true }); regionalScale(e, q); }
  return w;
}
function nearestOf(w) { const P = w.player; let near = null, nd = Infinity; for (const e of w.enemies) { if (e.dead || e.untargetable || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < nd) { nd = d; near = e; } } return [near, nd]; }
const FACES = [['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1]];
function face(P, dx, dy) { P.facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); }
// Player models for the Wayfarer bot. All swing on their build's rhythm (an arc of blows), face their target and keep
// `meleeUntil`/`dodgeUntil` as the game does.
//   careless  walks in on the nearest creature and trades blows: it never dodges and never steps out of a surround
//   average   the release-975 bot: closes on the nearest, dodges a windup it sees coming at its build's skill
//   skilled   keeps moving: dodges nearly every windup it sees coming (stamina permitting), steps out of a surround (three or
//             more within reach) before it swings, and kills priority targets first (the weakest in reach, else a caster)
export const MODELS = {
  careless: { dodge: 0, move: false, priority: false },
  average: { dodge: null, move: false, priority: false }, // null: the build's own skill
  skilled: { dodge: 92, move: true, priority: true, crowd: 3, crowdReach: 2.2 },
};
const RANGED_FAMILY = new Set(['caster']);
export function squadFight(w, build, { limit = 120, onFrame = null, heal = 0, model = 'average' } = {}) {
  const P = w.player, B = BUILDS[build], M = MODELS[model], skill = M.dodge ?? B.skill; let swingAt = -1e9, t = 0, dodges = 0, swings = 0, drinkAt = -1e9; const seenWind = new Set();
  while (t < limit && w.enemies.some((e) => !e.dead)) {
    t += w.dt; P.stamina = Math.min(100, P.stamina + STAMINA_REGEN * w.dt);
    let [target, td] = nearestOf(w);
    if (M.priority && target) { // the weakest in reach, else the nearest caster within 7, else the nearest
      let best = null, bh = Infinity, caster = null, cd = 7;
      for (const e of w.enemies) { if (e.dead || e.untargetable || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y);
        if (d <= B.reach && e.hp < bh) { bh = e.hp; best = e; } if (RANGED_FAMILY.has(behaviourProfile(e)?.family) && d < cd) { cd = d; caster = e; } }
      const pick = best || caster; if (pick) { target = pick; td = Math.hypot(pick.x - P.x, pick.y - P.y); }
    }
    let threatened = false;
    for (const e of w.enemies) {
      if (e.dead) continue; const s = e.pack, left = s?.attack && s.phase === 'windup' ? s.t : e.telegraph > 0 ? e.telegraph : 0;
      if (!(left > 0) || left > .3 || Math.hypot(e.x - P.x, e.y - P.y) > 3.5) continue;
      threatened = true;
      const key = `${e.id}:${s ? s.seq : e.attackAim?.x}`; if (seenWind.has(key)) continue; seenWind.add(key);
      if (P.stamina >= DODGE_COST && w.now > P.inv && hashSeed(`dodge:${key}:${build}`) % 100 < skill) { P.stamina -= DODGE_COST; P.inv = w.now + DODGE_IFRAMES; P.dodgeUntil = w.now + DODGE_IFRAMES; dodges++; }
    }
    if (heal > 0 && P.hp < P.maxHp * .5 && w.now - drinkAt > 12000) { drinkAt = w.now; P.hp = Math.min(P.maxHp, P.hp + heal); }
    w.playerSwinging = w.now < swingAt + 250; P.meleeUntil = swingAt + 250;
    if (target) face(P, target.x - P.x, target.y - P.y);
    let stepped = false;
    if (M.move) { // out of a surround: away from the crowd within reach (or from a windup it could not dodge)
      let n = 0, cx = 0, cy = 0; for (const e of w.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d <= M.crowdReach) { n++; cx += e.x; cy += e.y; } }
      if (n >= M.crowd || (threatened && w.now > P.inv && n > 0)) { cx /= n; cy /= n; const ax = P.x - cx, ay = P.y - cy, m = Math.hypot(ax, ay) || 1; const nx = P.x + ax / m * B.speed * w.dt, ny = P.y + ay / m * B.speed * w.dt; if (w.open(nx, ny)) { P.x = nx; P.y = ny; stepped = true; } }
    }
    if (!stepped && target && td > B.reach * .8 && w.now > drinkAt + 360) { const m = td || 1; P.x += (target.x - P.x) / m * B.speed * w.dt; P.y += (target.y - P.y) / m * B.speed * w.dt; }
    if (target && td <= B.reach && w.now >= swingAt + B.swing * 1000 && w.now > drinkAt + 360) {
      swingAt = w.now; swings++; const aim = Math.atan2(target.y - P.y, target.x - P.x);
      for (const e of w.enemies) { if (e.dead || e.untargetable) continue; const d = Math.hypot(e.x - P.x, e.y - P.y), a = Math.abs(((Math.atan2(e.y - P.y, e.x - P.x) - aim) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (d <= B.reach + .3 && a <= B.arc * Math.PI / 360) { e.hp -= B.damage; e.aggro = true; e.hitStun = Math.max(e.hitStun || 0, .18); e.hitFlash = .18; if (e.hp <= 0) { e.dead = true; e.hp = 0; } } }
    }
    frame(w);
    onFrame?.(w, t);
  }
  const taken = w.hurts.reduce((n, h) => n + h.amount, 0);
  return { time: t, cleared: w.enemies.every((e) => e.dead), taken, hits: w.hurts.length, dodges, swings, dpm: t > 0 ? taken / t * 60 : 0 };
}
// Standing in place: no swings, no dodges, facing the nearest creature. Seconds until `hp` is gone (capped at `limit`).
export function standStill(w, hp, { limit = 180 } = {}) {
  const P = w.player; let t = 0, taken = 0;
  while (t < limit && taken < hp) {
    t += w.dt; const [near] = nearestOf(w); if (near) face(P, near.x - P.x, near.y - P.y);
    w.playerSwinging = false; const before = w.hurts.length; frame(w);
    for (let i = before; i < w.hurts.length; i++) taken += w.hurts[i].amount;
  }
  return { time: t, taken, dpm: taken / t * 60 };
}
export { FACES };
