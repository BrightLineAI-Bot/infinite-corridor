// A headless arena for the Pachycephalosaurus (pachy.ts): the world the pack brain sees (as tests/earth-apato-harness.ts builds it),
// and a run loop with the duel controller. Not a test file itself.
import { MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { tickDinoDuels } from '../src/dino-duel.ts';
import { createCombatant } from '../src/combat.ts';

export function arena({ size = 40, player = { x: 20, y: 30 }, indoors = false, dodge = () => false } = {}) {
  const open = (x, y) => x >= 0 && y >= 0 && x < size - 1 && y < size - 1;
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], cues: [], creatureHits: [], shakes: [], said: [], forms: [], indoors, heldId: null,
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, map: { objects: [] }, oceanAt: () => false, playerVelocity: { x: 0, y: 0 },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    detour() {},
    hurt(source, amount, opts = {}) { if (dodge(w, opts)) return false; w.hurts.push({ amount, source: opts.source, by: source?.id ?? null, at: { x: w.player.x, y: w.player.y }, t: w.now, jumpable: !!opts.jumpable }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, by: source?.id ?? null, amount }); q.hp = Math.max(0, q.hp - amount); q.aggro = true; if (q.hp <= 0) { q.dead = true; q.noRewards = true; } return true; },
    bleed() { return true; }, biteMark() {}, shake(power) { w.shakes.push({ power, t: w.now }); }, say(t) { w.said.push(t); },
    spinoHold(source) { if (dodge(w, { grab: true })) return false; w.heldId = source.id; return true; }, held(source) { return w.heldId === source.id; }, release(source) { if (w.heldId === source.id) w.heldId = null; }, carry() {}, throwPlayer(source, dir, dist) { w.player.x += dir.x * dist * .5; w.player.y += dir.y * dist * .5; w.heldId = null; },
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {}, apatoPoison() { return true; }, apatoLatch() { return false; },
    pachyForm(e, form) { w.forms.push({ id: e.id, form, t: w.now }); },
    dinoSfx(c) { w.cues.push({ ...c, t: w.now / 1000 }); },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
export function beast(w, kind, { id = kind, x = 20, y = 18, hp = 4000, damage = 40, aggro = true, extra = {} } = {}) {
  const e = createCombatant(kind, x, y, true, []); Object.assign(e, { id, aggro, hp, maxHp: hp, damage }, extra); e.packAttacks = [...MONSTER_PACK[kind].attacks];
  w.enemies.push(e); return e;
}
export const pachy = (w, o = {}) => beast(w, 'pachy', { id: 'pachy', ...o });
export function run(w, seconds, each = () => {}, ctx = {}) {
  const events = [];
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000;
    for (const ev of tickDinoDuels(w.enemies, w.dt, { clock: 0, width: 40, height: 40, ...ctx })) events.push({ ...ev, at: w.now / 1000 });
    for (const e of w.enemies) updatePackMonster(e, w);
    w.fx = tickPackEffects(w.fx, w); each(t);
    w.enemies = w.enemies.filter((e) => !(e.dinoFled && e.fleeDone) && !(e.dead && e.summonedBy));
  }
  return events;
}
