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
    slow() { w.slows++; }, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {}, ignites: 0, ignite() { w.ignites++; },
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
  assert.equal(def.attacks.length, 12); // release 708: the grove, the mend, the birds and the mire for (const id of def.attacks) assert.ok(ATTACK_MODULES[id], id);
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
  const w = world({ player: { x: 18, y: 14 } }), e = stag(w, null, 12, 12), seen = new Set(); let most = 0; e.hp = e.maxHp * .5; // hurt, so it may mend
  step(w, 140, () => { if (e.pack?.attack) seen.add(e.pack.attack); most = Math.max(most, w.fx.length); w.player.x = 16 + Math.sin(w.now / 1500) * 6; w.player.y = 14 + Math.cos(w.now / 2100) * 5; });
  assert.deepEqual([...seen].sort(), [...MONSTER_PACK.briarStag.attacks].sort()); assert.ok(most <= 48);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : (...a) => { calls.push(k); }, set: () => true });
  for (const pose of [null, 'lower', 'charge', 'rear', 'stamp', 'hookL', 'hookR', 'toss', 'shake', 'crouch', 'leap', 'land', 'bellow', 'mend']) { e.stagPose = pose; e.stagHunt = pose === 'bellow' ? 3 : 0; e.stagMending = pose === 'mend'; drawPackMonster(ctx, e, 32, 1000, 'down'); }
  const fx = [{ kind: 'briar', x: 1, y: 1, radius: .6, life: 1, age: .5 }, { kind: 'thorn', x: 1, y: 1, vx: 1, vy: 0, life: 1 }, { kind: 'rootLine', x: 1, y: 1, dx: 1, dy: 0, steps: 4, step: 1, every: .1, warn: .5, radius: .5, life: 1, age: .6 }, { kind: 'rootRing', x: 4, y: 4, ring: 2, spikes: 6, turn: 0, radius: .5, arming: .2, armTotal: .5, life: .45, total: .45 }, { kind: 'stagSpike', x: 2, y: 2, radius: .5, life: .3, total: .45 }, { kind: 'burnTree', x: 3, y: 3, radius: .6, grow: .9, burn: 3, age: .4, life: 3, damage: 3, length: 1.9 }, { kind: 'burnTree', x: 4, y: 3, radius: .6, grow: .9, burn: 3, age: 2, life: 2, damage: 3, length: 1.9 }, { kind: 'burnTree', x: 5, y: 3, radius: .6, grow: .9, burn: 3, age: 4, life: .3, damage: 3, length: 1.9 }, { kind: 'birdDive', x: 1, y: 6, dx: 1, dy: 0, length: 18, speed: 17, radius: .65, arming: .3, armTotal: .6, life: 1, damage: 3 }, { kind: 'birdDive', x: 1, y: 7, dx: 1, dy: 0, length: 18, speed: 17, radius: .65, arming: 0, armTotal: .6, life: 1, damage: 3, bx: 5, by: 7 }, { kind: 'mire', x: 8, y: 8, radius: 5.5, arming: 0, life: 5, total: 8, damage: 0 }, { kind: 'thorn', ember: true, x: 1, y: 1, vx: 1, vy: 0, life: 1 }];
  for (const f of fx) assert.ok(STAG_EFFECT_KINDS.has(f.kind)); drawPackEffects(ctx, fx, 32, 1000); assert.ok(calls.length > 100);
});

test('given up, it bounds away to the deep woods: a forest region\'s section', () => {
  const s = freshSave(); s.seed = 'STAG-HOME'; ensureWorldBeasts(s); s.worldBeasts.briarStag.active = { rx: -8, ry: 3, tries: 1 }; // forests lie seven sections west in this world
  const g = new Game(s, 0), r = beginRetreat(s, 'briarStag', -8, 3, g.retreatProbe());
  assert.equal(r.home.found, true); assert.equal(sectionRegion(s.seed, r.home.rx, r.home.ry, 5).type, 'forest'); assert.match(r.message, /deep woods/);
});

// Release 708 (Tim, 2026-11-03): trees that burn and explode, a mend, hunting birds, and ground that dodges like water.
test('burning grove: trees grow round you, burn (touching one sets you alight), then explode in splinters', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = stag(w, 'stagGrove');
  until(w, e, 'stagGrove'); step(w, ATTACK_MODULES.stagGrove.windup * 1.3);
  const trees = w.fx.filter((f) => f.kind === 'burnTree'); assert.equal(trees.length, STAG.grove.trees);
  const t = trees[0]; w.player.x = t.x; w.player.y = t.y; step(w, STAG.grove.grow + .5); assert.ok(by(w, 'burnTree') >= 1); assert.ok(w.ignites >= 1, 'set alight');
  let splinters = 0; step(w, STAG.grove.burn[1], () => { splinters = Math.max(splinters, w.fx.filter((f) => f.kind === 'thorn' && f.ember).length); });
  assert.ok(by(w, 'burnTreeBlast') >= 1, 'it explodes on you'); assert.ok(splinters >= STAG.grove.splinters, `splinters fly (${splinters})`);
});

test('rooted mend: only when hurt, it heals part of its health, not all', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = stag(w, 'stagMend'); let started = false;
  step(w, 3, () => { started ||= e.pack.attack === 'stagMend'; }); assert.equal(started, false, 'not while whole');
  e.hp = e.maxHp * .4; until(w, e, 'stagMend'); step(w, ATTACK_MODULES.stagMend.windup * 1.3 + ATTACK_MODULES.stagMend.active + .2);
  const gained = e.hp / e.maxHp - .4; assert.ok(gained > STAG.mend.share * .9 && gained < STAG.mend.share * 1.1, `healed ${gained.toFixed(3)}`);
});

test('hunting birds: each stoops along a shown line from a different side', () => {
  const w = world({ player: { x: 16, y: 12 } }), e = stag(w, 'stagBirds'); const lines = new Map();
  until(w, e, 'stagBirds'); step(w, 4, () => { for (const f of w.fx) if (f.kind === 'birdDive') lines.set(f.id, Math.atan2(f.dy, f.dx)); });
  assert.equal(lines.size, STAG.birds.count); assert.equal(new Set([...lines.values()].map((a) => Math.round(a * 10))).size, STAG.birds.count, 'each from its own side');
  assert.ok(by(w, 'stagBirds') >= 1, 'standing still, you are found');
});

test('mire ground: in the game, dodges there cost more and go slower, moving drains stamina, standing still restores it', async () => {
  const { stagMireAt } = await import('../src/monster-pack.ts');
  const w = world({ player: { x: 16, y: 12 } }), e = stag(w, 'stagMire'); until(w, e, 'stagMire'); step(w, ATTACK_MODULES.stagMire.windup * 1.3 + STAG.mire.warn + .1);
  assert.ok(stagMireAt(w.fx, 16, 12)); assert.equal(stagMireAt(w.fx, 16 + STAG.mire.radius + 1, 12), false);
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
  const run = (onMire, still = false) => { const s = freshSave(); s.seed = 'MIRE'; const g = new Game(s, 0); g.enemies = []; const p = g.player; p.stamina = p.maxStamina = 100;
    g.packEffects = onMire ? [{ kind: 'mire', owner: 'x', x: p.x, y: p.y, radius: 8, arming: 0, life: 99, total: 99, damage: 0 }] : [];
    const x0 = p.x, y0 = p.y, st0 = p.stamina; let pressed = false, t = 1000;
    g.update(1 / 30, { state: { x: 1, y: 0 }, consume: (k) => k === 'dodge' && !pressed ? (pressed = true) : false, held: () => false, reset() {} }, t);
    const cost = st0 - p.stamina; for (let i = 0; i < 8; i++) g.update(1 / 30, still ? idle : { ...idle, state: { x: 1, y: 0 } }, t += 33);
    const dist = Math.hypot(p.x - x0, p.y - y0); for (let i = 0; i < 60; i++) g.update(1 / 30, still ? idle : { ...idle, state: { x: 0, y: i % 2 ? 1 : -1 } }, t += 33);
    return { cost, dist, after: p.stamina, g }; };
  const dry = run(false), wet = run(true);
  assert.ok(wet.cost > dry.cost * 1.8, `a dodge costs more on the mire (${dry.cost} → ${wet.cost})`);
  assert.ok(wet.dist < dry.dist * .85, `and goes less far (${dry.dist.toFixed(2)} → ${wet.dist.toFixed(2)})`);
  assert.ok(wet.after < dry.after - 5, `moving on it drains stamina (${dry.after.toFixed(1)} vs ${wet.after.toFixed(1)})`);
  const rest = run(true, true); assert.ok(rest.after > wet.after + 5, 'standing still, stamina comes back');
});
