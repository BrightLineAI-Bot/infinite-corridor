// Release 369 (Tim, 2026-10-23, "Far away wanderer"): the Listener's mirror form fights with reflections of the Wayfarer
// (up to eight, each its own health, fading in time, a phalanx rush, a swell), and holds the Wayfarer's shots around it
// (up to ten) before throwing them back. No more harmless illusions or place-swapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR_FORM, tickMirrorListener, tickReflection, reflectionsOf } from '../src/listener-mirror.ts';
import { LISTENER_FORMS } from '../src/far-array.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

function fake(kit = { tool: true, spell: true }) {
  const L = { id: 'L', x: 10, y: 10, maxHp: 1000, hp: 1000, damage: 20, scale: 1.25, farArrayBoss: 'listener', listenerPhase: 'open' }, enemies = [L], projectiles = [], hurts = [], shocks = [];
  const w = { now: 0, dt: .05, enemies, projectiles, player: { x: 10, y: 15 }, kit, open: () => true,
    spawn: (o, x, y, i, f) => { const c = { id: `c${i}`, x, y, mirrorClone: true, summonedBy: o.id, hp: Math.round(o.maxHp * f.hpShare), maxHp: Math.round(o.maxHp * f.hpShare), damage: 10, baseDamage: 10, scale: 1, baseScale: 1, ...f }; enemies.push(c); return c; },
    hurt: (s, n) => hurts.push(n), shock: (s, r, d) => shocks.push(d) };
  return { L, w, hurts, shocks };
}
const run = (L, w, seconds, step = .05) => { for (let t = 0; t < seconds; t += step) { w.now += step * 1000; w.dt = step; tickMirrorListener(L, w); for (const c of [...w.enemies]) if (c.mirrorClone && !c.dead) tickReflection(c, w); } };

test('the mirror form no longer casts harmless illusions or swaps places', () => {
  for (const a of ['mirrorClones', 'mirrorSwap']) { assert.ok(!LISTENER_FORMS.open.attacks.includes(a)); assert.ok(!LISTENER_FORMS.open.boss.includes(a)); }
});

test('reflections step out often, up to eight, each with its own health and the Wayfarer\'s kit, and fade in time', () => {
  const { L, w } = fake(); run(L, w, 40);
  const all = w.enemies.filter((q) => q.mirrorClone); assert.ok(all.length >= 8, `${all.length} stepped out`);
  let peak = 0; const { L: L2, w: w2 } = fake(); for (let k = 0; k < 800; k++) { run(L2, w2, .05); peak = Math.max(peak, reflectionsOf(w2.enemies, L2).length); } assert.equal(peak, MIRROR_FORM.maxClones);
  assert.ok(new Set(all.map((c) => c.maxHp)).size > 1, 'not all the same health'); for (const c of all) assert.ok(c.maxHp < L.maxHp * .2);
  assert.ok(all.every((c) => c.packAttacks.includes('clawSweep') && c.packAttacks.includes('shockwave')), 'sword and spell'); assert.ok(all.some((c) => c.archer), 'some carry the tool');
  const none = fake({ tool: false, spell: false }); run(none.L, none.w, 10); assert.ok(none.w.enemies.filter((q) => q.mirrorClone).every((c) => !c.archer && !c.packAttacks.includes('shockwave')));
  assert.ok(all.some((c) => c.faded), 'the oldest have faded');
  L.dead = true; run(L, w, .1); assert.ok(reflectionsOf(w.enemies, L).length === 0, 'they go with it');
});

test('a phalanx forms between it and you, then rushes; a swell makes them bigger and casts shockwaves', () => {
  const { L, w, hurts, shocks } = fake(); run(L, w, MIRROR_FORM.phalanx.every + .1);
  const line = w.enemies.filter((c) => c.phalanx); assert.ok(line.length >= MIRROR_FORM.phalanx.min, `${line.length} in line`);
  assert.ok(Math.abs(line[0].phalanx.slot.y - (15 - MIRROR_FORM.phalanx.distance)) < 1e-6 || Math.abs(line[0].phalanx.slot.y - 15) > 1, 'between the Listener and you');
  run(L, w, MIRROR_FORM.phalanx.form + MIRROR_FORM.phalanx.rush); assert.ok(hurts.length > 0, 'the rush lands'); assert.ok(!w.enemies.some((c) => c.phalanx), 'then they break ranks');
  run(L, w, MIRROR_FORM.swell.every - MIRROR_FORM.phalanx.every); const alive = reflectionsOf(w.enemies, L);
  assert.ok(shocks.length >= alive.length && alive.some((c) => c.scale > 1), 'swollen, and a shockwave each');
});

test('your shots stop around it (ten at most), then come back at you one after another', () => {
  const { L, w } = fake(); for (let i = 0; i < 14; i++) w.projectiles.push({ id: `s${i}`, x: 10.5 + (i % 3) * .2, y: 11.5, dx: 0, dy: -1, damage: 10 });
  tickMirrorListener(L, w); assert.equal(w.projectiles.filter((q) => q.dead).length, 10); assert.equal(L.mirror.frozen.length, 10);
  for (const q of w.projectiles) if (!q.dead) q.x = 30; // the four it could not hold fly on past
  w.now += MIRROR_FORM.freeze.hold * 1000; tickMirrorListener(L, w); let back = w.projectiles.filter((q) => q.mirrored);
  assert.equal(back.length, 1); assert.equal(back[0].hostile, true); assert.equal(back[0].damage, 8); assert.ok(back[0].dy > 0, 'at you');
  for (let i = 0; i < 12; i++) { w.now += MIRROR_FORM.freeze.every * 1000; tickMirrorListener(L, w); }
  back = w.projectiles.filter((q) => q.mirrored); assert.equal(back.length, 10); assert.equal(L.mirror.frozen.length, 0);
});

test('in the game: a mirror Listener spawns real reflections that fight and give nothing', () => {
  const s = freshSave(); s.seed = 'MIRROR'; const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  const L = g.createEnemyFromSpawn({ id: 'run:listener', kind: 'listener', x: g.player.x + 4, y: g.player.y, boss: true, farArrayBoss: 'listener', listenerForm: 'open', listenerPhase: 'open', dungeonRole: 'finalBoss' }); Object.assign(L, { farArrayBoss: 'listener', listenerForm: 'open', listenerPhase: 'open', aggro: true }); g.enemies = [L]; // (outside an Array run the spawn drops these)
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }; g.player.hp = 1e6; s.maxHp = 1e6;
  for (let t = 1000; t < 9000; t += 50) { g.player.hp = 1e6; g.update(.05, idle, t); }
  const r = g.enemies.filter((q) => q.mirrorClone && !q.dead); assert.ok(r.length >= 1, 'reflections'); assert.ok(r.every((q) => q.noRewards && q.kind === 'listener' && q.maxHp < L.maxHp));
  const c = r[0]; c.hp = 0; c.dead = true; g.defeatEnemy(c); assert.equal(c.rewarded, true);
});
