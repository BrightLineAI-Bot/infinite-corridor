// The Crimson Tyrant's aerial slam, Skyfall (monster-pack.ts dragonDive; Tim, 2026-11-12: "they can have a slam attack where they
// just slam down on you from the air"): it rises, hangs while a ring follows you, falls, and the blow lands only at the impact.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, ATTACK_MODULES, DRAGON, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { DRAGON_RIG, createDragonTrack, sampleDragon } from '../src/close-view-beast-dragon.ts';

function world(player = { x: 30, y: 20 }) {
  const open = (x, y) => x >= 0 && y >= 0 && x < 64 && y < 44;
  const w = {
    player: { ...player, hp: 1e6, maxHp: 1e6 }, dt: 1 / 60, now: 0, enemies: [], fx: [], hurts: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(e, amount, o = {}) { w.hurts.push({ amount, source: o.source, jumpable: !!o.jumpable, stage: e.pack?.data?.stage, air: e.dragonAir, at: w.now }); return true; },
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function tyrant(w) {
  const e = createCombatant('crimsonTyrant', 24, 20, true, []); Object.assign(e, { id: 'ct-dive', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 });
  e.packAttacks = ['dragonDive']; e.packBossAttacks = []; w.enemies.push(e); return e;
}
// one Skyfall from its start to its end; `each` sees every tick
function dive(w, e, each = () => {}) {
  let started = false;
  for (let t = 0; t < 12; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w);
    if (e.pack?.attack === 'dragonDive') started = true; else if (started) return true; each(e, w); }
  return started;
}
const ofDive = (w) => w.hurts.filter((h) => h.source === 'dragonDive');

test('the Tyrant has Skyfall; its numbers live in the DRAGON table and sit on the existing damage scale', () => {
  const A = ATTACK_MODULES.dragonDive, D = DRAGON.dive;
  assert.ok(MONSTER_PACK.crimsonTyrant.attacks.includes('dragonDive'));
  assert.ok(MONSTER_PACK.doomChaser.attacks.includes('dragonDive'), 'the Doom Chaser has Skyfall too (Tim, 2026-11-12)');
  assert.ok(MONSTER_PACK.doomChaser.attacks.includes('doomFall'), 'and keeps its own Falling Dark');
  assert.ok(A.tags.includes('flying') && A.cooldown >= 10, 'not spammed');
  assert.ok(A.damage >= ATTACK_MODULES.dragonSlam.damage && A.damage <= ATTACK_MODULES.doomFall.damage, `${A.damage}`);
  assert.ok(D.rise + D.hang + D.fall <= A.active, 'its stages fit in its active time');
  assert.ok(D.radius > 0 && D.height > 0 && D.track > 0 && DRAGON.pool.dive > 0);
});

test('it rises, hangs while its ring follows you, then falls; untargetable only while it is aloft', () => {
  const w = world(), e = tyrant(w), stages = [], ring = [];
  assert.ok(dive(w, e, (e) => {
    const d = e.pack?.data; if (e.pack?.attack !== 'dragonDive' || !d) return;
    if (d.stage && stages.at(-1) !== d.stage) stages.push(d.stage);
    if (d.stage === 'hang' || d.stage === 'fall') { assert.equal(e.pack.tele?.type, 'circle'); assert.equal(e.pack.tele.radius, DRAGON.dive.radius); ring.push(Math.hypot(e.pack.tele.x - e.x, e.pack.tele.y - e.y)); assert.ok(e.untargetable && e.aloft); }
  }));
  assert.deepEqual(stages, ['rise', 'hang', 'fall', 'done']);
  assert.ok(ring.length > 20 && ring.every((r) => r < 1e-9), 'the ring is under it');
  { const gap = Math.hypot(w.player.x - e.x, w.player.y - e.y); assert.ok(gap < DRAGON.dive.stop + .4 && gap > DRAGON.dive.stop - .4, `it came down beside you, you deep in its ring (${gap.toFixed(2)})`); assert.ok(gap < DRAGON.dive.radius); }
  assert.ok(!e.untargetable && !e.aloft && !(e.dragonAir > 0), 'down and targetable again');
});

test('the blow lands only at the impact, once, and not on a Wayfarer who left the ring', () => {
  const w = world(), e = tyrant(w); dive(w, e);
  const hits = ofDive(w); assert.equal(hits.length, 1, 'one blow'); assert.equal(hits[0].stage, 'done'); assert.equal(hits[0].air, 0, 'on the ground');
  assert.equal(hits[0].amount, Math.round(40 * ATTACK_MODULES.dragonDive.damage), 'its damage: 1.5 × the beast blow'); assert.equal(hits[0].jumpable, false);
  assert.ok(w.fx.some((f) => f.kind === 'lava'), 'it leaves fire where it landed');
  // dash out of the ring as it falls
  const w2 = world(), e2 = tyrant(w2); let fled = false;
  dive(w2, e2, (e) => { if (!fled && e.pack?.data?.stage === 'fall') { fled = true; w2.player.x = e.x + DRAGON.dive.radius + 2; } });
  assert.ok(fled); assert.equal(ofDive(w2).length, 0, 'out of the ring, untouched');
});

test('deterministic; Reduced Motion changes nothing in the fight and nothing breaks drawing it', () => {
  const run = (reduce) => { const w = world(), e = tyrant(w); e.reduceMotion = reduce; const path = []; dive(w, e, (e) => path.push(e.x.toFixed(4), e.y.toFixed(4), (e.dragonAir || 0).toFixed(4))); return { path, hits: ofDive(w).map((h) => [h.amount, h.at]) }; };
  assert.deepEqual(run(false), run(false)); assert.deepEqual(run(true), run(false));
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => {}, set: () => true });
  for (const reduceMotion of [false, true]) for (const pose of ['hang', 'dive', 'diveLand']) { const e = createCombatant('crimsonTyrant', 3, 3, true, []); Object.assign(e, { dragonPose: pose, dragonAir: pose === 'diveLand' ? 0 : 2, reduceMotion }); drawPackMonster(ctx, e, 32, 1000, 'down'); }
  // the Close View holds the hang still under Reduced Motion
  const w = world(), e = tyrant(w); let held = null;
  dive(w, e, (e) => { if (held || e.pack?.data?.stage !== 'hang') return; const tr = createDragonTrack('crimsonTyrant'), S = e.scale * DRAGON_RIG.closeViewScale, at = (now) => Array.from(sampleDragon(tr, e, { x: e.x, y: e.y, z: 0, scale: S, now, reduce: true, tier: 'full', target: w.player, dead: false }).skin);
    at(1000); const a = at(1016); held = [a, at(3000)]; });
  assert.ok(held); assert.deepEqual(held[1], held[0]);
});

test('its landing sends out a jumpable shockwave (Tim, 2026-11-12, as the stag leap); the Doom Chaser falls the same way', () => {
  for (const kind of ['crimsonTyrant', 'doomChaser']) {
    const w = world(), e = createCombatant(kind, 24, 20, true, []); Object.assign(e, { id: kind + '-dive', aggro: true, hp: 5e5, maxHp: 1e6, damage: 40 });
    e.packAttacks = ['dragonDive']; e.packBossAttacks = []; w.enemies.push(e);
    let shock = null; assert.ok(dive(w, e, () => { shock ||= w.fx.find((f) => f.kind === 'shock' && f.owner === e.id) || null; }), `${kind}: it dove`);
    assert.ok(shock, `${kind}: a shockwave`); assert.equal(shock.jumpable, true); assert.equal(shock.radius, DRAGON.dive.ring);
    const blow = ofDive(w).find((h) => !h.jumpable); assert.ok(blow, `${kind}: the blow at impact`); assert.ok(shock.damage < blow.amount, 'the ring hurts less than the blow');
  }
});
