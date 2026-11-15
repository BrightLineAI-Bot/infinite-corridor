// A headless fight for the ordinary creature behaviour pass (enemy-behaviour.ts): a flat floor, a packWorld-shaped adapter, a
// squad board when `squad` is set (the game's opt-in), and a simple Wayfarer bot of three builds that walks in, swings at the
// nearest creature and sometimes dodges a windup it can see coming. Deterministic: every roll is hashed.
import { updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { updateEnemyAI } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { createSquad, squadFrame, behaviourProfile, holdsToken } from '../src/enemy-behaviour.ts';
import { hashSeed } from '../src/random.ts';

export const BUILDS = {
  early: { damage: 9, swing: .55, reach: 1.9, arc: 110, skill: 25, speed: 2.6 },
  mid: { damage: 20, swing: .45, reach: 2.0, arc: 120, skill: 45, speed: 2.8 },
  late: { damage: 42, swing: .4, reach: 2.1, arc: 130, skill: 65, speed: 3 },
};
export const HURT_IFRAMES = 700, DODGE_IFRAMES = 420, DODGE_COST = 15, STAMINA_REGEN = 9;

export function flatWorld({ size = 40, player = { x: 20, y: 20 }, squad = true } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const tiles = Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size), kind: 'flagFloor', blocked: false, elev: 0 }));
  const w = {
    player: { ...player, hp: 100000, inv: 0, stamina: 100 }, width: size, height: size, dt: 1 / 30, now: 1000, enemies: [], effects: [], hurts: [], jumping: false, playerVelocity: { x: 0, y: 0 },
    playerSwinging: false, playerShots: [], playerBlasts: [], playerFacing: { x: 1, y: 0 }, map: { width: size, height: size, tiles, objects: [] },
    open, tileOpen: (x, y) => open(x - .5, y - .5), slowed: 0,
    los() { return true; },
    move(e, dx, dy, opts = {}) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { if (source?.illusion) return false; if (opts.jumpable && w.jumping) return false; if (w.now <= w.player.inv) return false; w.hurts.push({ amount, source: opts.source, kind: source?.kind, at: w.now }); w.player.hp -= amount; w.player.inv = w.now + (opts.beam ? 320 : HURT_IFRAMES); return true; },
    slow(f) { w.slowed = f; }, addEffect(effect) { addPackEffect(w.effects, effect, w.now); },
    spawnIllusion() { return null; }, spawnMinion() { return null; },
    squad: squad ? createSquad() : null,
  };
  return w;
}
export function spawn(w, kind, x, y, extra = {}) {
  const e = createCombatant(kind, x, y); Object.assign(e, { id: `${kind}-${w.enemies.length}`, ...extra }); w.enemies.push(e); return e;
}
// One frame: the squad board, every creature's brain, the ground effects.
export function frame(w) {
  w.now += w.dt * 1000;
  if (w.squad) squadFrame(w.squad, w.enemies, w.player, w.now, w.dt, w.playerSwinging, w.enemies);
  for (const e of w.enemies) {
    if (e.dead) continue;
    if (e.packKind) updatePackMonster(e, w);
    else if (updateEnemyAI(e, w.player, w.map, w.width, w.dt, w.now, null, () => {}, (q, dx, dy) => w.move(q, dx, dy), w.squad)) w.hurt(e, Math.max(1, Math.ceil(e.damage * (Number(e.strikeScale) || 1))), { source: 'legacy' });
  }
  w.effects = tickPackEffects(w.effects, w);
}
export function busyByPool(w) {
  const out = { melee: 0, swarm: 0, ranged: 0 };
  for (const e of w.enemies) { const B = behaviourProfile(e); if (!B || !e.bhv || !holdsToken(e)) continue; out[e.bhv.pool || (e.pack?.rangedPool ? 'ranged' : B.pool)]++; }
  return out;
}
// The Wayfarer bot: closes on the nearest creature, swings at it on its build's rhythm (an arc of blows), and dodges a windup
// it sees coming (an attack within .3 s of landing within 3.5 tiles) at its build's skill, stamina permitting.
export function fight(w, build, { limit = 90, onFrame = null } = {}) {
  const P = w.player, B = BUILDS[build]; let swingAt = 0, t = 0, dodges = 0, swings = 0; const seenWind = new Set();
  while (t < limit && w.enemies.some((e) => !e.dead)) {
    t += w.dt; P.stamina = Math.min(100, P.stamina + STAMINA_REGEN * w.dt);
    let near = null, nd = Infinity; for (const e of w.enemies) { if (e.dead || e.untargetable || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < nd) { nd = d; near = e; } }
    // dodge a readable windup
    for (const e of w.enemies) {
      if (e.dead) continue; const s = e.pack, left = s?.attack && s.phase === 'windup' ? s.t : e.telegraph > 0 ? e.telegraph : 0;
      if (!(left > 0) || left > .3 || Math.hypot(e.x - P.x, e.y - P.y) > 3.5) continue;
      const key = `${e.id}:${s ? s.seq : e.attackAim?.x}`; if (seenWind.has(key)) continue; seenWind.add(key);
      if (P.stamina >= DODGE_COST && w.now > P.inv && hashSeed(`dodge:${key}:${build}`) % 100 < B.skill) { P.stamina -= DODGE_COST; P.inv = w.now + DODGE_IFRAMES; dodges++; }
    }
    w.playerSwinging = w.now < swingAt + 250;
    if (near && nd > B.reach * .8) { const m = nd || 1; P.x += (near.x - P.x) / m * B.speed * w.dt; P.y += (near.y - P.y) / m * B.speed * w.dt; }
    if (near && nd <= B.reach && w.now >= swingAt + B.swing * 1000) {
      swingAt = w.now; swings++; const aim = Math.atan2(near.y - P.y, near.x - P.x);
      for (const e of w.enemies) { if (e.dead || e.untargetable) continue; const d = Math.hypot(e.x - P.x, e.y - P.y), a = Math.abs(((Math.atan2(e.y - P.y, e.x - P.x) - aim) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (d <= B.reach + .3 && a <= B.arc * Math.PI / 360) { e.hp -= B.damage; e.aggro = true; e.hitStun = Math.max(e.hitStun || 0, .18); e.hitFlash = .18; if (e.hp <= 0) { e.dead = true; e.hp = 0; } } }
    }
    frame(w);
    onFrame?.(w, t);
  }
  const taken = w.hurts.reduce((n, h) => n + h.amount, 0);
  return { time: Math.round(t * 100) / 100, cleared: w.enemies.every((e) => e.dead), taken, hits: w.hurts.length, dodges, swings };
}
export const MIXED = [['riftLynx', 3, 0], ['riftLynx', -3, 1], ['crystalCrab', 0, 3], ['crystalCrab', 2, -3], ['mirrorShade', -3, -2], ['thunderhorn', 4, 4], ['lumenWraith', -5, 3], ['veilSpinner', 5, -1], ['ashenHound', -4, 0], ['rootBrute', 0, -5]];
export function mixedPack(w, ring = 1) { const P = w.player; for (const [kind, dx, dy] of MIXED) spawn(w, kind, P.x + dx * ring, P.y + dy * ring, { aggro: true }); return w; }
export function swarm(w, n = 14) { const P = w.player; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 3 + (i % 3); spawn(w, i % 4 === 3 ? 'ashling' : 'pallidCrawler', P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { aggro: true }); } return w; }
