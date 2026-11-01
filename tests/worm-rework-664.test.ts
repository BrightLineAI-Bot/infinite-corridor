// Release 664 (Tim, 2026-11-01: "he should spend a lot of time with half of his model outside the ground and only come out
// every once in a while… when he's fully out he should be doing melee attacks where he swings, uses his length to attack,
// or slams down"): the Tremor Worm rework — half-buried by default, full-height melee (maw, body sweep, slam) now and then,
// tentacles that take their health from the worm, crack the ground before they rise, burrow between volleys, move at the
// limit, and fight six ways.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORM, ATTACK_MODULES, MONSTER_PACK, updatePackMonster, tickPackEffects, addPackEffect, freshPackState } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world({ size = 30, player = { x: 15, y: 15 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pulled: 0, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); return true; },
    slow() {}, push() {}, poison() {}, pull(src, step, radius) { const dx = src.x - w.player.x, dy = src.y - w.player.y, d = Math.hypot(dx, dy); if (!d || d > radius) return false; const k = Math.min(step, Math.max(0, d - 1)) / d; w.player.x += dx * k; w.player.y += dy * k; w.pulled += step; return true; },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
    spawnMinion(owner, kind, x, y, i) { const c = createCombatant(kind, x, y, false, []); Object.assign(c, { id: `${owner.id}:brood:${w.now}:${i}`, noRewards: true, summonedBy: owner.id, broodOf: owner.id, aggro: true }); w.enemies.push(c); return c; },
  };
  return w;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function worm(w, x = 8, y = 15, hp = 2000) { const c = createCombatant('tremorWorm', x, y, true, []); Object.assign(c, { id: 'worm-1', aggro: true, hp, maxHp: hp, damage: 20 }); w.enemies.push(c); return c; }
const hold = (m) => () => { if (m.pack.worm) m.pack.worm.t = 99; };
function cast(w, m, id) { m.packAttacks = [id]; m.pack = freshPackState(); m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; m.pack.gap = 0; m.hidden = false; m.untargetable = false; }
const tentacles = (w, m) => w.enemies.filter((q) => q.wormOf === m.id && !q.dead);

test('every worm move has a posture; the maw, the body sweep and the slam are its only full-height moves', () => {
  for (const id of MONSTER_PACK.tremorWorm.attacks) assert.ok(['half', 'full'].includes(ATTACK_MODULES[id].posture), id);
  assert.deepEqual(MONSTER_PACK.tremorWorm.attacks.filter((id) => ATTACK_MODULES[id].posture === 'full').sort(), ['wormMaw', 'wormSlam', 'wormSweep']);
});

test('it stays half out of the ground by default and rears all the way up only for a full move, now and then', () => {
  const w = world(), m = worm(w); m.packAttacks = ['wormRocks']; w.player.x = m.x + 6;
  let most = 0; step(w, 2, () => { hold(m)(); most = Math.max(most, m.wormLift); });
  assert.ok(Math.abs(m.wormLift - WORM.halfHeight) < .01 && most <= WORM.halfHeight + .01, `half-buried while it throws rocks: ${most}`);
  cast(w, m, 'wormSweep'); w.player.x = m.x + 3; let up = 0; step(w, 1.2, () => { hold(m)(); up = Math.max(up, m.wormLift); });
  assert.ok(up > .95, 'all the way up for the sweep'); assert.ok(w.hurts.some((h) => h.source === 'wormSweep'), 'and its length catches you');
  step(w, 1.5, hold(m)); assert.ok(m.wormLift < .55, 'then back down to half');
  m.packAttacks = ['wormSlam']; m.pack.gap = 0; w.hurts = []; step(w, 2, hold(m));
  assert.equal(w.hurts.some((h) => h.source === 'wormSlam'), false, `no second full move inside ${WORM.fullGap} s`);
  step(w, WORM.fullGap, hold(m)); assert.ok(w.hurts.some((h) => h.source === 'wormSlam'), 'the slam, once the gap has passed');
});

test('the slam comes down along a line and bursts where the head lands', () => {
  const w = world(), m = worm(w); cast(w, m, 'wormSlam'); w.player.x = m.x + WORM.slamLength - .2; w.player.y = m.y;
  step(w, 1.4, hold(m)); assert.ok(w.hurts.some((h) => h.source === 'wormSlam'));
  const v = world(), n = worm(v); cast(v, n, 'wormSlam'); v.player.x = n.x; v.player.y = n.y + 4; step(v, .1, hold(n)); v.player.x = n.x + 4; v.player.y = n.y + 4; step(v, 1.4, hold(n));
  assert.equal(v.hurts.some((h) => h.source === 'wormSlam'), false, 'off the line, it misses');
});

test('tentacles take their health from the worm, and the ground cracks where they will rise', () => {
  const w = world(), m = worm(w, 8, 15, 4000); cast(w, m, 'wormTentacles'); w.player.x = 16;
  step(w, .1, hold(m));
  const cracks = w.fx.filter((f) => f.kind === 'wormCracks'); assert.equal(cracks.length, WORM.fieldTentacles, 'a crack per tentacle'); assert.equal(tentacles(w, m).length, 0, 'before any rises');
  step(w, 1, hold(m)); const field = tentacles(w, m); assert.equal(field.length, WORM.fieldTentacles);
  for (const q of field) { assert.equal(q.maxHp, Math.round(4000 * WORM.tentacleHp)); assert.ok(cracks.some((c) => Math.hypot(c.x - q.x, c.y - q.y) < .01), 'each rises on its crack'); }
  const small = world(), s = worm(small, 8, 15, 100); cast(small, s, 'wormTentacles'); small.player.x = 16; step(small, 1.1, hold(s));
  assert.ok(tentacles(small, s).every((q) => q.maxHp === WORM.tentacleHpMin), 'never weaker than before');
});

test('casts deal out six tentacle modes; a cast at the limit moves the field instead of doing nothing', () => {
  const w = world(), m = worm(w); w.player.x = 16;
  for (let i = 0; i < 3; i++) { cast(w, m, 'wormTentacles'); m.pack.seq = i; step(w, 1.1, hold(m)); }
  const field = tentacles(w, m); assert.equal(field.length, WORM.tentaclesMax);
  assert.deepEqual(field.map((q) => q.tentacleMode).sort(), [...WORM.tentacleModes].sort(), 'one of each');
  const before = field.map((q) => [q.x, q.y].join());
  for (const q of field) { q.tentPhase = null; q.hidden = false; }
  cast(w, m, 'wormTentacles'); m.pack.seq = 9; step(w, 1, hold(m));
  assert.ok(field.every((q) => q.tentPhase === 'sinking' || q.tentPhase === 'under'), 'the whole field goes under');
  let cracked = false; step(w, WORM.repositionUnder[1] + WORM.tentacleSink + WORM.tentacleRise + 1, () => { hold(m)(); cracked ||= w.fx.some((f) => f.kind === 'wormCracks'); });
  assert.ok(cracked, 'cracks show where they come back up'); assert.equal(tentacles(w, m).length, WORM.tentaclesMax, 'no new ones');
  assert.ok(field.some((q, i) => [q.x, q.y].join() !== before[i]), 'and they come up somewhere new');
});

function oneTentacle(mode, near = 3) {
  const w = world(), m = worm(w, 4, 4); m.packAttacks = []; m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 };
  const c = w.spawnMinion(m, 'wormTentacle', 15, 15, 0); Object.assign(c, { wormOf: m.id, bornAt: 0, tentacleMode: mode, hp: 999, maxHp: 999 });
  w.player.x = 15 + near; w.player.y = 15; return { w, m, c };
}

test('a grab tentacle reaches along a lane, drags you in and squeezes; a dodge slips it', () => {
  const { w, m, c } = oneTentacle('grab', 4); let held = false; step(w, 4, () => { hold(m)(); held ||= !!c.grabbing; });
  assert.ok(held && w.pulled > 0, 'it drags you in'); assert.ok(w.hurts.some((h) => h.source === 'wormGrab'), 'and squeezes');
  const t = oneTentacle('grab', 4); t.w.pull = () => false; step(t.w, 4, hold(t.m)); assert.ok(!t.c.grabbing, 'dodging, nothing catches');
});

test('a swipe tentacle lashes whoever comes close, and burrows after you when you keep away', () => {
  const { w, m, c } = oneTentacle('swipe', 1.5); step(w, 2.5, hold(m)); assert.ok(w.hurts.some((h) => h.source === 'wormSwipe'), 'it swipes');
  const far = oneTentacle('swipe', 6); let sank = false; step(far.w, WORM.tentacleRise + WORM.swipeChase + .4, () => { hold(far.m)(); sank ||= !!far.c.tentPhase; }); assert.ok(sank, 'kept out of reach, it goes under to come up by you');
  assert.ok(c);
});

test('orb tentacles loose homing orbs that turn after you; spread tentacles loose fans', () => {
  const { w, m } = oneTentacle('orbs', 4); let orb = null; step(w, 2, () => { hold(m)(); orb ||= w.fx.find((f) => f.kind === 'orb' && f.homing); });
  assert.ok(orb, 'a homing orb'); const a0 = Math.atan2(orb.vy, orb.vx); w.player.y += 4; step(w, .4, hold(m)); assert.notEqual(Math.atan2(orb.vy, orb.vx).toFixed(3), a0.toFixed(3), 'it turns after you');
  const sp = oneTentacle('spread', 4); let most = 0; step(sp.w, 2.5, () => { hold(sp.m)(); most = Math.max(most, sp.w.fx.filter((f) => f.kind === 'orb' && f.fire).length); });
  assert.ok(most >= WORM.spreadShots, `a fan of ${WORM.spreadShots}: ${most}`);
});

test('tentacles burrow between volleys and come up around you, wounds and all', () => {
  const { w, m, c } = oneTentacle('fire', 3); c.hp = 50; const at = [c.x, c.y]; let sank = false;
  step(w, 8, () => { hold(m)(); sank ||= c.tentPhase === 'under'; });
  assert.ok(sank, 'it went under between volleys'); assert.notDeepEqual([c.x, c.y], at, 'and came up elsewhere');
  assert.ok(Math.hypot(c.x - w.player.x, c.y - w.player.y) <= WORM.tentacleRing[1] + 2.1, 'around you'); assert.equal(c.hp, 50);
});
