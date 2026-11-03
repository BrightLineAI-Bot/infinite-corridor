// Release 706 (Tim, 2026-11-03: "a few more world bosses... similar attack and aggressiveness and strength... varied amount of
// attacks... so they're pretty chaotic"): the Ashen Moth, a flying world beast of ash and ember.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_HOMES, BEAST_APERTURE, BEAST_FOREST, ensureWorldBeasts, beginRetreat } from '../src/world-beasts.ts';
import { MONSTER_PACK, ATTACK_MODULES, MOTH, BOSS_POISE, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects } from '../src/monster-render.ts';
import { sectionRegion } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

function world({ size = 32, player = { x: 16, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 100000 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pushes: 0, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); w.player.hp -= amount; return true; },
    slow() {}, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function moth(w, only, x = 13, y = 12) {
  const e = createCombatant('ashenMoth', x, y, true, []); Object.assign(e, { id: 'moth-1', aggro: true, hp: 5000, maxHp: 5000, damage: 40 });
  if (only) { e.packAttacks = [only]; e.packBossAttacks = []; }
  w.enemies.push(e); return e;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function until(w, e, id, max = 6) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, source) => w.hurts.filter((h) => h.source === source).length;

test('registry: a flying world beast with seven attacks and a lantern beam, its own home, poise, Echo and Aperture gate', () => {
  const B = WORLD_BEASTS.ashenMoth, def = MONSTER_PACK.ashenMoth;
  assert.equal(B.home, 'firelands'); assert.equal(B.tries, 4); assert.equal(B.retreatMoves, 'through'); assert.equal(def.movement, 'hover');
  assert.equal(def.attacks.length, 9); // release 708: Silk Threads, Silk Burst assert.deepEqual(def.bossAttacks, ['sweepBeam']); for (const id of [...def.attacks, ...def.bossAttacks]) assert.ok(ATTACK_MODULES[id], id);
  assert.ok(ECHOES.ashenMoth); assert.ok(BOSS_POISE.ashenMoth); assert.equal(BEAST_APERTURE.ashenMoth, 7);
  assert.ok(BEAST_HOMES.firelands.tile({ kind: 'ash' })); assert.equal(BEAST_HOMES.firelands.tile({ kind: 'grass' }), false);
});

test('ash gust: throws you back and leaves ash that flares', () => {
  const w = world({ player: { x: 16, y: 12 } }), e = moth(w, 'mothGust');
  until(w, e, 'mothGust'); step(w, ATTACK_MODULES.mothGust.windup + .2);
  assert.equal(by(w, 'mothGust'), 1); assert.equal(w.pushes, 1); assert.equal(w.fx.filter((f) => f.kind === 'emberDust').length, MOTH.gustAsh);
});

test('kindling dust: one cloud on you, the rest round you, each flaring in turn', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = moth(w, 'mothDust');
  until(w, e, 'mothDust'); step(w, ATTACK_MODULES.mothDust.windup + .1);
  const clouds = w.fx.filter((f) => f.kind === 'emberDust'); assert.equal(clouds.length, MOTH.dust);
  assert.ok(clouds.some((f) => Math.hypot(f.x - 18, f.y - 12) < .01)); step(w, 2); assert.ok(by(w, 'emberDust') >= 1);
  const out = world({ player: { x: 18, y: 12 } }), e2 = moth(out, 'mothDust'); until(out, e2, 'mothDust'); step(out, ATTACK_MODULES.mothDust.windup + .1); out.player.x = 28; out.player.y = 28; step(out, 2.5); assert.equal(by(out, 'emberDust'), 0, 'walk out of it and nothing flares on you');
});

test('burning dive: through you in a line, fire left behind', () => {
  const w = world({ player: { x: 20, y: 12 } }), e = moth(w, 'mothDive', 10, 12);
  until(w, e, 'mothDive'); step(w, ATTACK_MODULES.mothDive.windup * 1.3 + ATTACK_MODULES.mothDive.active + .1);
  assert.ok(e.x > 18); assert.equal(by(w, 'mothDive'), 1); assert.ok(w.fx.filter((f) => f.kind === 'flameTrail').length >= 4); assert.equal(e.aloft, false);
});

test('ember spiral, moth swarm and the cocoon', () => {
  const a = world({ player: { x: 18, y: 12 } }), e1 = moth(a, 'mothSpiral'); let most = 0;
  until(a, e1, 'mothSpiral'); step(a, 3, () => { most = Math.max(most, a.fx.filter((f) => f.kind === 'orb').length); }); assert.ok(most >= 12, `embers in the air (${most})`);
  const b = world({ player: { x: 20, y: 14 } }), e2 = moth(b, 'mothSwarm'); until(b, e2, 'mothSwarm'); step(b, ATTACK_MODULES.mothSwarm.windup + .1);
  const swarm = b.fx.filter((f) => f.moth); assert.equal(swarm.length, MOTH.swarm); step(b, 3); assert.ok(by(b, 'mothSwarm') + b.hurts.length >= 1, 'they find you');
  const c = world({ player: { x: 16, y: 12 } }), e3 = moth(c, 'mothCocoon'); until(c, e3, 'mothCocoon'); step(c, ATTACK_MODULES.mothCocoon.windup + .3);
  assert.equal(e3.untargetable, true); assert.equal(e3.mothCocoon, true); step(c, ATTACK_MODULES.mothCocoon.active);
  assert.equal(e3.untargetable, false); assert.ok(c.fx.some((f) => f.kind === 'shock')); assert.ok(c.fx.filter((f) => f.kind === 'orb').length >= MOTH.cocoonEmbers - 2);
});

test('Kindled: faster, fire where it flies, dust drifting down, for a while', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = moth(w, 'mothKindle');
  until(w, e, 'mothKindle'); step(w, ATTACK_MODULES.mothKindle.windup + .1); assert.ok(e.mothKindled > 0);
  e.packAttacks = ['mothGust']; step(w, 3); assert.ok(w.fx.some((f) => f.kind === 'flameTrail')); assert.ok(w.fx.some((f) => f.kind === 'emberDust'));
  step(w, MOTH.kindle.time); assert.equal(e.mothKindled, 0);
});

test('a full fight runs every attack, keeps its effects bounded, and draws without throwing', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = moth(w, null, 12, 12), seen = new Set(); let most = 0;
  step(w, 100, () => { if (e.pack?.attack) seen.add(e.pack.attack); most = Math.max(most, w.fx.length); w.player.x = 16 + Math.sin(w.now / 1500) * 6; w.player.y = 14 + Math.cos(w.now / 2100) * 5; });
for (const id of MONSTER_PACK.ashenMoth.attacks) assert.ok(seen.has(id), id); assert.ok(most <= 48);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : (...a) => { calls.push(k); }, set: () => true });
  for (const pose of [null, 'raise', 'beat', 'shake', 'climb', 'dive', 'spin', 'fold']) { e.mothPose = pose; e.mothKindled = pose === 'beat' ? 3 : 0; e.mothCocoon = pose === 'fold'; drawPackMonster(ctx, e, 32, 1000, 'down'); }
  drawPackEffects(ctx, [{ kind: 'emberDust', x: 1, y: 1, radius: .9, arming: .5, armTotal: 1, life: .4, damage: 3 }, { kind: 'emberDust', x: 2, y: 2, radius: .9, arming: 0, life: .3, damage: 3 }, { kind: 'orb', fire: true, moth: true, x: 3, y: 3, vx: 1, vy: 1, radius: .3, life: 2, damage: 3 }], 32, 1000);
  assert.ok(calls.length > 100);
});

test('given up, it drifts home to the ash lands', () => {
  let start = null; for (let rx = -20; rx <= 20 && !start; rx++) for (let ry = -20; ry <= 20 && !start; ry++) if (Math.abs(rx) + Math.abs(ry) > 8 && BEAST_FOREST.fire.includes(sectionRegion('MOTH-HOME', rx + 3, ry, 5).type)) start = { rx, ry };
  assert.ok(start); const s = freshSave(); s.seed = 'MOTH-HOME'; ensureWorldBeasts(s); s.worldBeasts.ashenMoth.active = { ...start, tries: 1 };
  const g = new Game(s, 0), r = beginRetreat(s, 'ashenMoth', start.rx, start.ry, g.retreatProbe());
  assert.equal(r.home.found, true); assert.ok(BEAST_FOREST.fire.includes(sectionRegion(s.seed, r.home.rx, r.home.ry, 5).type)); assert.match(r.message, /ash lands/);
});

test('release 707: a dive stops where its lane ends, never inside a wall', () => {
  const w = world({ player: { x: 20, y: 12 } }); const wall = (x, y) => Math.floor(x + .5) >= 17; w.tileOpen = (x, y) => !wall(x - .5, y - .5);
  const e = moth(w, 'mothDive', 10, 12); until(w, e, 'mothDive'); step(w, ATTACK_MODULES.mothDive.windup * 1.3 + ATTACK_MODULES.mothDive.active + .1);
  assert.ok(e.x < 16.6, `stopped short of the wall (${e.x.toFixed(2)})`);
});

// Release 708: Silk Threads and Silk Burst: projectiles that home on you for a while (less than the Knight's orbs), trailing silk.
test('silk threads: a fan that bends toward you for a while, then flies straight; the burst: two great knots that follow and burst', async () => {
  const { KNIGHT } = await import('../src/monster-pack.ts');
  assert.ok(MOTH.threads.turn * MOTH.threads.home < KNIGHT.orbTurn * KNIGHT.orbHome && MOTH.burst.turn * MOTH.burst.home < KNIGHT.orbTurn * KNIGHT.orbHome, 'gentler homing than the Knight\'s orbs');
  const w = world({ player: { x: 20, y: 12 } }), e = moth(w, 'mothThreads'); until(w, e, 'mothThreads'); step(w, ATTACK_MODULES.mothThreads.windup * 1.3);
  const silk = w.fx.filter((f) => f.kind === 'silk'); assert.equal(silk.length, MOTH.threads.count);
  const outer = silk.reduce((m, f) => Math.abs(f.vy) > Math.abs(m.vy) ? f : m); const a0 = Math.atan2(outer.vy, outer.vx); w.player.y = 12 + (outer.vy > 0 ? 4 : -4); step(w, .5);
  assert.notEqual(Math.atan2(outer.vy, outer.vx).toFixed(2), a0.toFixed(2), 'it bends after you'); assert.ok(outer.trail.length > 3, 'trailing silk');
  step(w, MOTH.threads.home - .4); const before = Math.atan2(outer.vy, outer.vx); w.player.y = 12 - (outer.vy > 0 ? 6 : -6); step(w, .4); if (outer.life > 0) assert.equal(Math.atan2(outer.vy, outer.vx).toFixed(3), before.toFixed(3), 'and then flies straight');
  const b = world({ player: { x: 20, y: 12 } }), e2 = moth(b, 'mothThreadBlast'); until(b, e2, 'mothThreadBlast'); step(b, 3);
  assert.ok(by(b, 'mothThreadBlast') >= 1, 'the knots find you'); const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  drawPackEffects(ctx, [{ kind: 'silk', x: 3, y: 3, vx: 1, vy: 0, radius: .24, trail: [[1, 3], [2, 3]], life: 1, damage: 3 }, { kind: 'silk', big: true, x: 5, y: 3, vx: 1, vy: 0, radius: .55, trail: [[3, 3], [4, 3]], life: 1, damage: 3 }], 32, 1000);
});
