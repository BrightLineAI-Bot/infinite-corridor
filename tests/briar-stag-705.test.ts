// Release 705 (Tim, 2026-11-03: "a few more world bosses... similar attack and aggressiveness and strength... varied amount of
// attacks... so they're pretty chaotic"): the Briar Stag, a forest world beast with eight attacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_HOMES, BEAST_APERTURE, PLACEMENT, tuneWorldBeast, ensureWorldBeasts, beginRetreat } from '../src/world-beasts.ts';
import { sectionRegion } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { MONSTER_PACK, ATTACK_MODULES, STAG, BOSS_POISE, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects } from '../src/monster-render.ts';
import { STAG_EFFECT_KINDS } from '../src/briar-stag-render.ts';
import { freshSave } from '../src/types.ts';

function world({ size = 32, player = { x: 16, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 100000 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pushes: 0, slows: 0, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); w.player.hp -= amount; return true; },
    slow() { w.slows++; }, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function stag(w, only, x = 13, y = 12) {
  const e = createCombatant('briarStag', x, y, true, []); Object.assign(e, { id: 'stag-1', aggro: true, hp: 5000, maxHp: 5000, damage: 40 });
  if (only) e.packAttacks = [only];
  w.enemies.push(e); return e;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function until(w, e, id, max = 6) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, source) => w.hurts.filter((h) => h.source === source).length;

test('registry: a forest world beast with eight attacks, its own home, poise, Echo and Aperture gate', () => {
  const B = WORLD_BEASTS.briarStag, def = MONSTER_PACK.briarStag;
  assert.equal(B.kind, 'briarStag'); assert.equal(B.home, 'forest'); assert.equal(B.tries, 4); assert.ok(BEAST_HOMES.forest);
  assert.equal(def.attacks.length, 8); for (const id of def.attacks) assert.ok(ATTACK_MODULES[id], id);
  assert.ok(ECHOES.briarStag); assert.ok(BOSS_POISE.briarStag); assert.equal(BEAST_APERTURE.briarStag, 6); assert.ok(PLACEMENT.bigBeasts.includes('briarStag'));
  assert.ok(BEAST_HOMES.forest.object({ kind: 'tree', forest: true })); assert.equal(BEAST_HOMES.forest.object({ kind: 'tree' }), false);
});

test('tuned to the Wayfarer like the other world beasts', () => {
  const s = freshSave(); s.level = 20; s.maxHp = 200; s.equipment.primary = { power: 30 }; s.activeWeaponSlot = 'primary';
  const e = tuneWorldBeast(createCombatant('briarStag', 0, 0, true, []), s, 'briarStag'), g = tuneWorldBeast(createCombatant('lightningGiant', 0, 0, true, []), s, 'lightningGiant');
  assert.ok(e.maxHp > 0 && e.damage > 0); assert.ok(e.maxHp / g.maxHp > .8 && e.maxHp / g.maxHp < 1.1, 'about as tough as the Giant');
});

test('antler hooks: two hooks then a toss that throws you back', () => {
  const w = world({ player: { x: 15, y: 12 } }), e = stag(w, 'stagGore');
  until(w, e, 'stagGore'); step(w, 2);
  assert.equal(by(w, 'stagGore'), 3); assert.equal(w.pushes, 1);
});

test('bramble rush: two or three rushes, each leaving brambles that slow and scratch', () => {
  const w = world({ player: { x: 22, y: 12 } }), e = stag(w, 'stagCharge', 6, 12);
  until(w, e, 'stagCharge'); const x0 = e.x; step(w, 1.6);
  assert.ok(e.x > x0 + 3, 'it rushes'); assert.ok(w.fx.some((f) => f.kind === 'briar'), 'brambles spring up');
  step(w, 5); assert.ok(by(w, 'stagCharge') >= 1);
  const v = world({ player: { x: 10, y: 10 } }); v.fx.push({ kind: 'briar', owner: 'x', x: 10, y: 10, radius: STAG.briarRadius, life: 2, total: 2, damage: 3 }); v.fx = tickPackEffects(v.fx, v);
  assert.equal(v.slows, 1); assert.equal(by(v, 'briar'), 1);
});

test('running roots burst spike by spike along three lines; standing aside from them is safe', () => {
  const w = world({ player: { x: 19, y: 12 } }), e = stag(w, 'stagRoots');
  until(w, e, 'stagRoots'); step(w, .7);
  const lines = w.fx.filter((f) => f.kind === 'rootLine'); assert.equal(lines.length, STAG.rootLines);
  step(w, 2); assert.equal(by(w, 'stagRoots'), 1, 'the middle line finds you once');
  const safe = world({ player: { x: 19, y: 12 } }), e2 = stag(safe, 'stagRoots'); until(safe, e2, 'stagRoots'); step(safe, ATTACK_MODULES.stagRoots.windup + .1); safe.player.y = 4; step(safe, 3); // the lines aim where you were when it stamped assert.equal(by(safe, 'stagRoots'), 0);
});

test('thorn volleys: three fans of thorns', () => {
  const w = world({ player: { x: 20, y: 12 } }), e = stag(w, 'stagThorns'); let most = 0;
  until(w, e, 'stagThorns'); step(w, 2, () => { most = Math.max(most, w.fx.filter((f) => f.kind === 'thorn').length); });
  assert.ok(most >= STAG.thornShots * 2, `fans in the air (${most})`); assert.ok(by(w, 'stagThorns') >= 1);
});

test('canopy leap: out of reach in the air, its shadow follows you, it lands where it is and throws a ring and roots', () => {
  const w = world({ player: { x: 20, y: 14 } }), e = stag(w, 'stagLeap', 10, 10);
  until(w, e, 'stagLeap'); step(w, ATTACK_MODULES.stagLeap.windup + .6);
  assert.equal(e.untargetable, true); assert.ok(e.stagAir > 0);
  step(w, 2); assert.ok(Math.hypot(e.x - 20, e.y - 14) < 1, 'it came down on you');
  assert.ok(by(w, 'stagLeap') >= 1); assert.ok(w.fx.some((f) => f.kind === 'rootRing')); assert.equal(e.untargetable, false);
});

test('bramble cage: three rings close in; standing in the open between spikes or outside is safe', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = stag(w, 'stagCage');
  until(w, e, 'stagCage'); step(w, .6);
  const rings = w.fx.filter((f) => f.kind === 'rootRing'); assert.equal(rings.length, 3); assert.deepEqual(rings.map((r) => r.ring), STAG.cageRings);
  // Stand on the outer ring, on a spike: hit. Far outside: safe.
  const r = rings[0]; w.player.x = r.x + Math.cos(r.turn) * r.ring; w.player.y = r.y + Math.sin(r.turn) * r.ring; step(w, 1.2);
  assert.ok(by(w, 'rootRing') >= 1);
  const out = world({ player: { x: 18, y: 12 } }), e2 = stag(out, 'stagCage'); until(out, e2, 'stagCage'); step(out, .6); out.player.x = 26; step(out, 2.5); assert.equal(by(out, 'rootRing'), 0);
});

test('rearing stomp: two jumpable rings', () => {
  const w = world({ player: { x: 15, y: 12 } }), e = stag(w, 'stagStomp'); let rings = 0;
  until(w, e, 'stagStomp'); step(w, 1.6, () => { rings = Math.max(rings, w.fx.filter((f) => f.kind === 'shock').length); });
  assert.ok(rings >= 1); assert.ok(by(w, 'stagStomp') >= 2, 'both stamps land in reach');
});

test('the Wild Hunt: it throws you back, then runs faster, leaving brambles, roots bursting round it, for a while', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = stag(w, 'stagHunt');
  until(w, e, 'stagHunt'); step(w, ATTACK_MODULES.stagHunt.windup + .1);
  assert.equal(w.pushes, 1); assert.ok(e.stagHunt > 0);
  e.packAttacks = ['stagStomp']; step(w, 3);
  assert.ok(w.fx.some((f) => f.kind === 'briar')); assert.ok(w.fx.some((f) => f.kind === 'stagSpike'));
  step(w, STAG.hunt.time); assert.equal(e.stagHunt, 0);
});

test('a full fight runs every attack, keeps its effects bounded, and draws without throwing', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = stag(w, null, 12, 12), seen = new Set(); let most = 0;
  step(w, 90, () => { if (e.pack?.attack) seen.add(e.pack.attack); most = Math.max(most, w.fx.length); w.player.x = 16 + Math.sin(w.now / 1500) * 6; w.player.y = 14 + Math.cos(w.now / 2100) * 5; });
  assert.deepEqual([...seen].sort(), [...MONSTER_PACK.briarStag.attacks].sort()); assert.ok(most <= 48);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : (...a) => { calls.push(k); }, set: () => true });
  for (const pose of [null, 'lower', 'charge', 'rear', 'stamp', 'hookL', 'hookR', 'toss', 'shake', 'crouch', 'leap', 'land', 'bellow']) { e.stagPose = pose; e.stagHunt = pose === 'bellow' ? 3 : 0; drawPackMonster(ctx, e, 32, 1000, 'down'); }
  const fx = [{ kind: 'briar', x: 1, y: 1, radius: .6, life: 1, age: .5 }, { kind: 'thorn', x: 1, y: 1, vx: 1, vy: 0, life: 1 }, { kind: 'rootLine', x: 1, y: 1, dx: 1, dy: 0, steps: 4, step: 1, every: .1, warn: .5, radius: .5, life: 1, age: .6 }, { kind: 'rootRing', x: 4, y: 4, ring: 2, spikes: 6, turn: 0, radius: .5, arming: .2, armTotal: .5, life: .45, total: .45 }, { kind: 'stagSpike', x: 2, y: 2, radius: .5, life: .3, total: .45 }];
  for (const f of fx) assert.ok(STAG_EFFECT_KINDS.has(f.kind)); drawPackEffects(ctx, fx, 32, 1000); assert.ok(calls.length > 100);
});

test('given up, it bounds away to the deep woods: a forest region\'s section', () => {
  const s = freshSave(); s.seed = 'STAG-HOME'; ensureWorldBeasts(s); s.worldBeasts.briarStag.active = { rx: -8, ry: 3, tries: 1 }; // forests lie seven sections west in this world
  const g = new Game(s, 0), r = beginRetreat(s, 'briarStag', -8, 3, g.retreatProbe());
  assert.equal(r.home.found, true); assert.equal(sectionRegion(s.seed, r.home.rx, r.home.ry, 5).type, 'forest'); assert.match(r.message, /deep woods/);
});
