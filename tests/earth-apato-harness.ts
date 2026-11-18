// A headless arena for the Earth Apatosaurus (earth-apato.ts): the world the pack brain sees (as tests/dino-duel.test.ts builds
// it), with its clone, venom and coil hooks, a save for the venom, and a run loop. Not a test file itself.
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { tickDinoDuels } from '../src/dino-duel.ts';
import { tuneApatoClone } from '../src/earth-apato.ts';
import { dosePoison, ensureApatoPoison } from '../src/apato-poison.ts';
import { createCombatant } from '../src/combat.ts';

export function arena({ size = 40, player = { x: 20, y: 30 }, indoors = false, dodge = () => false } = {}) {
  const open = (x, y) => x >= 0 && y >= 0 && x < size - 1 && y < size - 1;
  const save = { apatoPoison: null }; ensureApatoPoison(save);
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], cues: [], creatureHits: [], shakes: [], said: [], indoors, save, heldId: null,
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, map: { objects: [] }, oceanAt: () => false, playerVelocity: { x: 0, y: 0 },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    detour() {},
    hurt(source, amount, opts = {}) { if (dodge(w, opts)) return false; w.hurts.push({ amount, source: opts.source, by: source?.id ?? null, at: { x: w.player.x, y: w.player.y }, t: w.now, jumpable: !!opts.jumpable }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, by: source?.id ?? null, amount }); q.hp = Math.max(0, q.hp - amount); q.aggro = true; if (q.hp <= 0) { q.dead = true; q.noRewards = true; } return true; },
    bleed() { return true; }, biteMark() {}, shake(power) { w.shakes.push({ power, t: w.now }); }, say(t) { w.said.push(t); },
    spinoHold(source) { if (dodge(w, { grab: true })) return false; w.heldId = source.id; return true; }, held(source) { return w.heldId === source.id; }, release(source) { if (w.heldId === source.id) w.heldId = null; }, carry() {}, throwPlayer(source, dir, dist) { w.player.x += dir.x * dist * .5; w.player.y += dir.y * dist * .5; w.heldId = null; },
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
    apatoPoison(stacks, source) { dosePoison(save, stacks, source); return true; },
    apatoLatch() { return !dodge(w, { latch: true }); },
    spawnApatoClone(owner, x, y, n) { const c = createCombatant('apatoClone', x, y, false, []); tuneApatoClone(c, owner, n); w.enemies.push(c); return c; },
    dinoSfx(c) { w.cues.push({ ...c, t: w.now / 1000 }); },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
export function apato(w, { id = 'apato', x = 20, y = 18, hp = 4000, damage = 40, aggro = true } = {}) {
  const e = createCombatant('earthApato', x, y, true, []); Object.assign(e, { id, aggro, hp, maxHp: hp, damage }); e.packAttacks = [...MONSTER_PACK.earthApato.attacks];
  w.enemies.push(e); return e;
}
export function beast(w, kind, { id = kind, x = 30, y = 18, hp = 4000, damage = 40, aggro = true } = {}) {
  const e = createCombatant(kind, x, y, true, []); Object.assign(e, { id, aggro, hp, maxHp: hp, damage }); e.packAttacks = [...MONSTER_PACK[kind].attacks];
  w.enemies.push(e); return e;
}
// Steps every creature (and the duel controller); `each(t)` after each frame. Returns the duel's events.
export function run(w, seconds, each = () => {}, ctx = {}) {
  const events = [];
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000;
    for (const ev of tickDinoDuels(w.enemies, w.dt, { clock: 0, width: 40, height: 40, ...ctx })) events.push({ ...ev, at: w.now / 1000 });
    for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); else updatePackMonster(e, w);
    w.fx = tickPackEffects(w.fx, w); each(t);
    w.enemies = w.enemies.filter((e) => !(e.dinoFled && e.fleeDone) && !(e.dead && e.summonedBy));
  }
  return events;
}
// Starts one move at once (as the brain would), aimed at the Wayfarer.
export function force(w, e, id) { e.pack.cd = {}; e.pack.gap = 0; e.pack.state = 'attack'; e.pack.attack = null; return id; }
