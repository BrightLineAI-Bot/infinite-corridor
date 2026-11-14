// The Carbine with the Shadow Clone out (Tim, 2026-11-14: "when you have the Shadow Clone out, the Shadow Clone will charge its
// blast with you. So when you charge your blast, the Shadow Clone charges its blast, and it'll increase its damage also").
// tool-forms.ts CLONE_CARBINE; game.ts carbine.charge.clone, cloneCarbineFire, cloneCarbineAim, cloneCarbineGlow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade, CARBINE_RANK } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { CARBINE, CLONE_CARBINE, cloneCarbineBoost, cloneCarbineRatio, carbineFill, carbineShare, shotPiercesTerrain, drawCarbine } from '../src/tool-forms.ts';
import { SHADOW_CLONE } from '../src/late-spells.ts';
import { standardProjectileColor } from '../src/combat-visuals.ts';

const W = 40;
const coil = () => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK });
// An open room; the Wayfarer at (3, 9.55) aiming right; the clone (when out) two tiles below her.
function arena({ foes = [[12, 9.55]], clone = true, finesse = 30 } = {}) {
  const s = freshSave(); s.seed = 'CLONE-CARBINE'; Object.assign(s.stats, { Finesse: finesse, Focus: 1, Might: 1 }); ensureLattice(s); s.lattice.passives = [];
  s.equipment.secondary = coil(); s.activeWeaponSlot = 'secondary'; s.rounds.loaded = 1e5; s.materials.cinderIron = 1e7;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, aggro: false }));
  if (clone) g.shadowClone = { ox: 0, oy: 2, until: 1e12 };
  return { s, g };
}
const input = (held = () => false) => ({ state: { x: 0, y: 0 }, consume: () => false, held });
function run(g, frames, t, inp = input()) { for (let i = 0; i < frames; i++) { t += 50; g.update(.05, inp, t); g.player.x = 3; g.player.y = 9.55; } return t; }
// Press, hold `seconds` (with `during(g, t)` each frame), release: the new beams.
function charge(g, t, seconds, during = null) {
  let down = true; const inp = input(() => down), before = new Set(g.projectiles);
  assert.equal(g.fireSecondary(t, { x: 1, y: 0 }, 'tool'), true, 'the press starts a charge');
  for (let i = 0; i < Math.round(seconds / .05); i++) { t = run(g, 1, t, inp); during?.(g, t); }
  down = false; t = run(g, 1, t, inp);
  const fresh = g.projectiles.filter((p) => !before.has(p) && p.carbine);
  return { t, beam: fresh.find((p) => !p.shadow && !p.echo), clone: fresh.find((p) => p.shadow), fresh };
}

test('the table: a modest bonus, scaled by the shared charge; a tap gains nothing; no clone, no bonus', () => {
  assert.ok(CLONE_CARBINE.bonus > 0 && CLONE_CARBINE.bonus <= .25, 'modest');
  assert.equal(cloneCarbineBoost(null), 1); assert.equal(cloneCarbineBoost(0), 1); assert.equal(cloneCarbineBoost(.1), 1, 'inside the grace: a tap');
  assert.equal(cloneCarbineBoost(CARBINE.charge.full), 1 + CLONE_CARBINE.bonus); assert.equal(cloneCarbineBoost(99), 1 + CLONE_CARBINE.bonus, 'capped');
  assert.equal(cloneCarbineRatio(1, 1), 1); assert.equal(cloneCarbineRatio(CARBINE.charge.full, 0), 1 / CARBINE.charge.max);
  assert.ok(Object.isFrozen(CLONE_CARBINE) && CLONE_CARBINE.cone > 0 && CLONE_CARBINE.cone < 1);
});

test('with the clone out the charge is mirrored: the clone charges beside her, glowing at its own muzzle', () => {
  const { g } = arena(); let down = true; const inp = input(() => down);
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'), true);
  assert.equal(g.carbine.charge.clone, 0, 'the clone starts its charge with hers');
  let t = run(g, 12, 1000, inp); const c = g.carbine.charge;
  assert.ok(c.held > CARBINE.charge.grace && Math.abs(c.clone - c.held) < 1e-9, `clone ${c.clone} mirrors ${c.held}`);
  const q = g.cloneCarbineGlow(); assert.ok(q, 'the clone glows'); assert.equal(q.k, carbineFill(c.held));
  assert.ok(Math.abs(q.cx - 3.5) < 1e-9 && Math.abs(q.cy - 12) < 1e-9, 'at the clone'); assert.ok(Math.hypot(q.x - q.cx, q.y - q.cy) - CLONE_CARBINE.muzzle < 1e-9);
  // Without a clone nothing mirrors and nothing glows.
  const { g: h } = arena({ clone: false }); h.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); run(h, 12, 1000, inp);
  assert.equal(h.carbine.charge.clone, null); assert.equal(h.cloneCarbineGlow(), null);
  // The Shadow Boxing echo and a clone still being placed do not charge.
  const { g: b } = arena(); b.shadowClone.boxing = true; b.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); run(b, 12, 1000, inp); assert.equal(b.carbine.charge.clone, null);
  down = false; t = run(g, 1, t, inp); assert.equal(g.carbine.charge, null); assert.equal(g.cloneCarbineGlow(), null, 'the glow ends with the release');
});

test('the release fires both beams: hers from her muzzle, the clone\'s from where it stands, at the same foe', () => {
  const { g } = arena(); const { beam, clone, fresh } = charge(g, 1000, 1.3);
  assert.ok(beam && clone, 'two beams'); assert.equal(fresh.filter((p) => p.shadow).length, 1, 'one clone beam');
  assert.ok(Math.abs(clone.bx - beam.bx - (clone.dx - beam.dx) * .35) < 1e-9 && Math.abs(clone.by - beam.by - 2 - (clone.dy - beam.dy) * .35) < 1e-9, 'from the clone, two tiles below her');
  const ex = 12 - 3, ey = 9.55 - 11.55, m = Math.hypot(ex, ey); assert.ok(Math.abs(clone.dx - ex / m) < .03 && Math.abs(clone.dy - ey / m) < .03, `at her foe (${clone.dx}, ${clone.dy})`);
  assert.equal(clone.glyphHost, null); assert.equal(clone.assault, undefined); assert.deepEqual(clone.launchAt, [3, 11.55]);
  assert.equal(standardProjectileColor(clone), CLONE_CARBINE.colors.beam, 'violet'); assert.equal(standardProjectileColor(beam), CARBINE.colors.beam);
  run(g, 10, 2000); assert.ok(g.enemies[0].hp < 1e9, 'both strike');
});

test('damage scales with the charge exactly as hers; the bonus only with the clone out', () => {
  const dmg = (clone, held) => { const { g } = arena({ clone }); if (held === 0) { g.fireSecondary(1000, { x: 1, y: 0 }); return { beam: g.projectiles.find((p) => !p.shadow), clone: g.projectiles.find((p) => p.shadow) }; } return charge(g, 1000, held); };
  const tap0 = dmg(false, 0).beam.damage, tap1 = dmg(true, 0);
  assert.equal(tap1.beam.damage, tap0, 'a tap: no bonus'); assert.equal(tap1.clone.damage, Math.round(tap0 * SHADOW_CLONE.share), 'a small clone tap');
  const full0 = dmg(false, 1.3), full1 = dmg(true, 1.3);
  assert.equal(full0.clone, undefined, 'no clone: no clone beam');
  assert.equal(full0.beam.damage, Math.round(tap0 * CARBINE.charge.max), 'without the clone: unchanged');
  assert.equal(full1.beam.damage, Math.round(tap0 * CARBINE.charge.max * (1 + CLONE_CARBINE.bonus)), 'her full beam × (1 + bonus)');
  assert.equal(full1.clone.damage, Math.round(full1.beam.damage * SHADOW_CLONE.share), 'the clone\'s full beam at its share');
  assert.equal(full1.clone.charge, 1); assert.equal(full1.clone.pierce, full1.beam.pierce);
  const half1 = dmg(true, .75), k = carbineFill(.75);
  assert.ok(half1.beam.damage > tap0 && half1.beam.damage < full1.beam.damage); assert.ok(half1.clone.damage > tap1.clone.damage && half1.clone.damage < full1.clone.damage, 'the clone scales too');
  assert.ok(Math.abs(half1.beam.damage - tap0 * carbineShare(.75) * (1 + CLONE_CARBINE.bonus * k)) <= 1.5);
});

test('the clone expiring mid-charge cancels its charge cleanly; a clone cast mid-charge starts from nothing', () => {
  const { g } = arena(); const { beam, clone } = charge(g, 1000, 1.3, (h, t) => { if (t >= 1400 && h.shadowClone) h.shadowClone.until = t; });
  assert.equal(clone, undefined, 'no clone beam'); assert.equal(g.cloneCarbineGlow(), null);
  const { g: n } = arena({ clone: false }); assert.equal(beam.damage, charge(n, 1000, 1.3).beam.damage, 'no bonus once it is gone');
  // Stepped into (the clone gone) mid-charge: the same.
  const { g: s } = arena(); const r = charge(s, 1000, 1.3, (h, t) => { if (t === 1500) h.shadowClone = null; }); assert.equal(r.clone, undefined);
  // Cast mid-charge: it charges from then on, less than she has.
  const { g: late } = arena({ clone: false }); const q = charge(late, 1000, 1.3, (h, t) => { if (t === 1600) h.shadowClone = { ox: 0, oy: 2, until: 1e12 }; });
  assert.ok(q.clone && q.clone.charge < 1 && q.clone.charge > 0, `a part charge ${q.clone?.charge}`); assert.ok(q.beam.damage > Math.round(charge(arena({ clone: false }).g, 1000, 1.3).beam.damage), 'a smaller bonus still');
});

test('a stagger or putting the Carbine away cancels her charge and the clone\'s: nothing fires', () => {
  for (const cancel of [(h, t) => { h.player.stunnedUntil = t + 500; }, (h) => { h.save.equipment.secondary = null; }]) {
    const { g } = arena(); let down = true; const inp = input(() => down); g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); let t = run(g, 10, 1000, inp);
    cancel(g, t); t = run(g, 1, t, inp); assert.equal(g.carbine.charge, null); assert.equal(g.cloneCarbineGlow(), null);
    down = false; run(g, 2, t, inp); assert.equal(g.projectiles.filter((p) => p.carbine).length, 0, 'no beam on the release'); assert.ok(!g.projectiles.some((p) => p.shadow), 'no clone beam');
  }
  // Paused: the charge does not grow (runtime clocks stop with the update).
  const { g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); run(g, 6, 1000, input(() => true)); const was = { ...g.carbine.charge };
  g.paused = true; run(g, 20, 1300, input(() => true)); assert.equal(g.carbine.charge.held, was.held); assert.equal(g.carbine.charge.clone, was.clone);
});

test('line of sight: a walled-off foe hands the clone\'s beam to the nearest foe it can see the same way, else it fires along her aim', () => {
  // The clone three tiles below her (3, 12.55); a wall at (6..7, 11) cuts its line to her foe (10, 9.55) but not hers (her beam
  // runs along y 10): the clone takes the foe it can see that way, at (12, 13.55).
  const walled = (foes) => { const { g } = arena({ foes }); g.shadowClone.oy = 3; for (const x of [6, 7]) g.map.tiles[11 * W + x].blocked = true; return g; };
  const g = walled([[10, 9.55], [12, 13.55]]), { clone, beam } = charge(g, 1000, 1.3), e = g.enemies[1];
  assert.ok(beam.dx > .99, 'her beam is clear'); const ex = e.x - 3, ey = e.y - 12.55, m = Math.hypot(ex, ey);
  assert.ok(Math.abs(clone.dx - ex / m) < .05 && Math.abs(clone.dy - ey / m) < .05, `the visible foe (${clone.dx}, ${clone.dy})`);
  // None visible that way (the other foe is behind her): along her aim.
  const r = charge(walled([[10, 9.55], [1, 1]]), 1000, 1.3); assert.ok(Math.abs(r.clone.dx - r.beam.dx) < 1e-9 && Math.abs(r.clone.dy - r.beam.dy) < 1e-9, 'along her aim (the foe behind is outside the cone)');
  // Close View occlusion: the clone's shot leaves its own ground, not hers (she is in the air); only a full charge pierces.
  const { g: a } = arena(), part = charge(a, 1000, .6); a.skyAir = 2; a.shotOccluded(part.clone, 6, 12.5); a.shotOccluded(part.beam, 6, 10.5);
  assert.equal(part.clone.launchZ, 0, 'from the clone\'s feet'); assert.ok(part.beam.launchZ > 0, 'hers from the air');
  assert.equal(shotPiercesTerrain(part.clone), false, 'a part charge does not pierce'); assert.equal(shotPiercesTerrain(charge(arena().g, 1000, 1.3).clone), true, 'a full one does, as hers');
});

test('drawn in both views: the clone\'s glow and ring (finite, also with reduced motion); Close View reads the same glow', () => {
  const { g } = arena(); const calls = { arc: 0, fill: 0 }, fills = [];
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { if (k in calls) calls[k]++; if (k === 'fill') fills.push(o.fillStyle); for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} got ${v}`); }, set: (o, k, v) => { o[k] = v; return true; } });
  g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); run(g, 15, 1000, input(() => true));
  for (const pres of [{}, { reduceMotion: true }]) { g.presentation = pres; calls.arc = 0; fills.length = 0; drawCarbine(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 1); assert.ok(calls.arc >= 6, 'her glow and ring, and the clone\'s'); assert.ok(fills.includes(CLONE_CARBINE.colors.beam) && fills.includes(CLONE_CARBINE.colors.core), 'violet'); }
  const cv = fs.readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'); assert.match(cv, /g\.cloneCarbineGlow\?\.\(\)/); assert.match(cv, /CLONE_CARBINE\.colors/);
  const vis = fs.readFileSync(new URL('../src/combat-visuals.ts', import.meta.url), 'utf8'); assert.match(vis, /game\.cloneCarbineGlow\?\.\(now\)/, 'the Close View clone faces its aim');
  assert.equal(g.cloneCarbineGlow(), g.cloneCarbineGlow(), 'one scratch object');
});

test('60 s soak, cooldowns wiped every frame, clone recast: finite, bounded; and deterministic', () => {
  const soak = () => {
    const { g } = arena({ foes: [[10, 9.55], [14, 10.55], [18, 8.55], [22, 12.55]] }); let t = 1000, down = false, maxShots = 0, maxFx = 0; const inp = input(() => down);
    for (let i = 0; i < 1200; i++) {
      g.player.attackReadyAt = 0; if (i % 9 === 0) down = !down; if (i % 37 === 0) g.shadowClone = { ox: (i % 3) - 1, oy: 2, until: t + 4000 };
      if (!g.carbine?.charge) g.fireSecondary(t, { x: 1, y: 0 }, down ? 'tool' : null);
      t = run(g, 1, t, inp); maxShots = Math.max(maxShots, g.projectiles.length); maxFx = Math.max(maxFx, g.effects.length);
      for (const p of g.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.damage) && p.damage >= 1, 'finite shots');
      const c = g.carbine?.charge; if (c) assert.ok(Number.isFinite(c.held) && (c.clone == null || (Number.isFinite(c.clone) && c.clone <= c.held + 1e-9)));
      for (const e of g.enemies) e.hp = 1e9;
    }
    assert.ok(maxShots <= 70, `shots ${maxShots}`); assert.ok(maxFx <= 64, `effects ${maxFx}`); assert.equal(g.carbine.traces.length, CARBINE.trace.max);
    return JSON.stringify({ shots: g.projectiles.map((p) => [p.id, p.x, p.y, p.damage, p.shadow || false]), held: g.carbine.charge, rounds: g.save.rounds });
  };
  assert.equal(soak(), soak(), 'the same run twice gives the same state');
  const src = fs.readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), fire = src.slice(src.indexOf('  cloneCarbineEligible('), src.indexOf('  // The afterglow follows a beam'));
  assert.ok(fire.length > 100 && !fire.includes('Math.random'), 'no Math.random');
});
