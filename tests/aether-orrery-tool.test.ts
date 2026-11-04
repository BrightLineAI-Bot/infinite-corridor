// The Aether Orrery (Tim, 2026-11-04): a magic-damage tool. Tap: an orb that sheds pellets. Hold: a cone of sparks, then a
// piercing great orb; overcharging locks the charge for about 6 s. Echo glyphs: up to three circling orbs (contact damage,
// drone lasers, a triangle while charging, right-angle two-hit lasers on release). Shadow Clone: its own orb and a tether.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, grantOrreryGear, GAME_CLOCKS, RESUME_GAME_CLOCKS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { rangedWeapon, isValidItem, APERTURE_BANDS } from '../src/items.ts';
import { ORRERY, orreryPress, tickOrrery, orbTier, chargeShare, overcharged, beamsTouching, inTriangle, inCone, segDist, drawOrrery } from '../src/tool-forms.ts';

function arena(glyphs = [], stats = {}, foes = [[14, 10]]) {
  const s = freshSave(); s.seed = 'ORRERY'; s.perception.aperture = 3255; s.stats = { ...s.stats, ...stats };
  s.equipment.secondary = { ...ORRERY.item, tier: 'relic', extraSockets: 1, glyphs };
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe${i}`, hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 }));
  g.projectiles = []; g.effects = [];
  return { s, g };
}
const input = (press, hold) => { let used = false; return { state: { x: 0, y: 0 }, consume: (q) => q === press && !used && (used = true), held: (q) => !!hold && q === hold }; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const DT = 1 / 60;
// Frames of the game with foes held in place (the dummies stand still).
function frames(g, n, inp, t, pin = true) { const at = g.enemies.map((e) => [e.x, e.y]); for (let i = 0; i < n; i++) { g.update(DT, typeof inp === 'function' ? inp(i) : inp, t); t += DT * 1000; if (pin) g.enemies.forEach((e, k) => { if (at[k]) { e.x = at[k][0]; e.y = at[k][1]; } }); } return t; }
const lost = (e) => e.maxHp - e.hp;
const of = (g, kind) => g.projectiles.filter((p) => !p.dead && p.orrery === kind);

test('the Aether Orrery is a magic tool, given once at Infinite III like the brawler gear, and valid gear', () => {
  const w = rangedWeapon(ORRERY.item); assert.equal(w.damageType, 'magic'); assert.equal(w.orrery, true);
  assert.equal(rangedWeapon({ name: 'Aether Orrery' }).orrery, true);
  assert.ok(isValidItem({ ...ORRERY.item }));
  const s = freshSave(); s.perception.aperture = 0; assert.equal(grantOrreryGear(s), false); assert.ok(!s.inventory.some((q) => q.name === 'Aether Orrery'));
  const band = APERTURE_BANDS[ORRERY.band]; assert.ok(band, 'the band exists');
  s.perception.aperture = 1e9; assert.equal(grantOrreryGear(s), true); assert.equal(s.inventory.filter((q) => q.name === 'Aether Orrery').length, 1);
  assert.equal(grantOrreryGear(s), false, 'once'); assert.equal(s.inventory.filter((q) => q.name === 'Aether Orrery').length, 1);
});

test('its damage grows with Focus, not with Might (spell power)', () => {
  const focus = arena([], { Focus: 120 }).g.orreryPower(), might = arena([], { Might: 120 }).g.orreryPower(), plain = arena().g.orreryPower();
  assert.ok(focus > plain * 3, `${focus} vs ${plain}`); assert.ok(Math.abs(might - plain) < 1e-9, 'Might adds nothing');
});

test('tap: a fast orb that bursts on its foe and sheds slow pellets that also damage', () => {
  const { g } = arena([], {}, [[13, 13.6]]); // a foe off the orb's line, where a pellet drifts
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true);
  const orb = of(g, 'orb')[0]; assert.ok(orb && orb.damageType === 'magic' && orb.glyphHost === 'tool' && orb.speed === ORRERY.tap.speed);
  assert.equal(g.fireSecondary(1100, { x: 1, y: 0 }), false, 'the tap cooldown');
  let t = 1000, shed = 0; for (let i = 0; i < 40; i++) { t = frames(g, 1, idle, t); shed = Math.max(shed, of(g, 'pellet').length); }
  assert.ok(shed >= 5, `pellets shed: ${shed}`);
  const p = of(g, 'pellet'); assert.ok(p.every((q) => q.speed === ORRERY.pellet.speed && q.damageType === 'magic' && q.minor));
  assert.ok(new Set(p.map((q) => Math.atan2(q.dy, q.dx).toFixed(2))).size === p.length, 'in different directions');
  // pellets damage: one aimed straight at a foe
  const { g: h } = arena([], {}, [[11.5, 10]]); h.projectiles.push({ id: 'pel', x: 10.5, y: 10.45, dx: 1, dy: 0, speed: ORRERY.pellet.speed, life: 1, damage: 7, damageType: 'magic', path: 'straight', age: 0, hits: {}, pierce: 0, glyphHost: null, orrery: 'pellet', minor: true });
  frames(h, 40, idle, 1000); assert.ok(lost(h.enemies[0]) >= 7, 'a pellet hit');
  // the orb itself
  const { g: k } = arena([], {}, [[12, 10]]); k.fireSecondary(1000, { x: 1, y: 0 }); frames(k, 30, idle, 1000); assert.ok(lost(k.enemies[0]) >= orb.damage - 1, 'the orb hit');
});

test('charge: while Tool is held a cone of sparks damages foes in front, and you can walk while charging', () => {
  const { g } = arena([], {}, [[12.2, 10.8]]); g.toolReadyAt = 1e12; // no tap orb: only the cone
  let t = frames(g, 1, input('tool', 'tool'), 1000); assert.ok(g.orrery.charge, 'charging');
  const x0 = g.player.x; t = frames(g, 40, { state: { x: 0, y: 1 }, consume: () => false, held: (q) => q === 'tool' }, t, true);
  assert.ok(g.player.y > 10 || g.player.x !== x0, 'moved while charging'); assert.ok(g.orrery.charge, 'still charging');
  Object.assign(g.player, { x: 10, y: 10 }); g.save.lastAim = { x: 1, y: 0 }; const before = lost(g.enemies[0]);
  t = frames(g, 30, input(null, 'tool'), t); assert.ok(lost(g.enemies[0]) > before, 'the cone burned it');
  assert.equal(of(g, 'big').length, 0, 'no great orb until release');
  assert.ok(inCone(12, 10.4, 10.5, 10.45, 1, 0, ORRERY.cone.range, ORRERY.cone.half)); assert.ok(!inCone(8, 10.4, 10.5, 10.45, 1, 0, ORRERY.cone.range, ORRERY.cone.half));
});

test('release: a great orb that passes through every foe, stronger the longer it was held', () => {
  const { g } = arena([], {}, [[12.5, 10], [14, 10], [15.5, 10]]); g.toolReadyAt = 1e12;
  let t = frames(g, 1, input('tool', 'tool'), 1000); t = frames(g, Math.round(ORRERY.charge.full * 60), input(null, 'tool'), t);
  const coneOnly = g.enemies.map(lost); t = frames(g, 1, idle, t);
  const big = of(g, 'big')[0]; assert.ok(big && big.knife && big.damage > 0, 'the great orb'); assert.equal(g.orrery.charge, null);
  t = frames(g, 90, idle, t); assert.ok(g.enemies.every((e, i) => lost(e) - coneOnly[i] >= big.damage - 1), 'it passed through all three');
  assert.ok(chargeShare(ORRERY.charge.full) > chargeShare(ORRERY.charge.grace + .05)); assert.equal(chargeShare(99), ORRERY.big.max);
});

test('overcharge: holding past the limit loses the charge and locks charging ~6 s; a normal release never locks', () => {
  assert.ok(ORRERY.charge.lockout >= 5.5 && ORRERY.charge.lockout <= 6.5); assert.equal(overcharged(ORRERY.charge.max + .01), true);
  const { g } = arena(); g.toolReadyAt = 1e12;
  // a normal release: charge again at once, again and again
  let t = 1000; for (let k = 0; k < 4; k++) { t = frames(g, 1, input('tool', 'tool'), t); assert.ok(g.orrery.charge, `charge ${k} starts`); t = frames(g, 60, input(null, 'tool'), t); t = frames(g, 1, idle, t); assert.ok(!(g.orreryLockUntil > t), 'no lockout'); }
  // overcharge
  t = frames(g, 1, input('tool', 'tool'), t); t = frames(g, Math.round((ORRERY.charge.max + .1) * 60), input(null, 'tool'), t);
  assert.equal(g.orrery.charge, null, 'the charge is lost'); assert.ok(g.orreryLockUntil > t + 5000 && g.orreryLockUntil <= t + 6100, 'locked about 6 s');
  const bigs = of(g, 'big').length; t = frames(g, 2, idle, t); assert.equal(of(g, 'big').length, bigs, 'an overcharge fires nothing');
  t = frames(g, 1, input('tool', 'tool'), t); assert.equal(g.orrery.charge, null, 'no charge while locked'); t = frames(g, 1, idle, t);
  g.toolReadyAt = 0; assert.equal(g.fireSecondary(t, { x: 1, y: 0 }), true, 'taps still fire while locked');
  t = frames(g, 6 * 60, idle, t); g.toolReadyAt = 1e12; t = frames(g, 1, input('tool', 'tool'), t); assert.ok(g.orrery.charge, 'charging again after the lockout');
});

test('Echo tiers: one circling orb per Echo glyph in the tool, three at most', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(orbTier), [0, 1, 2, 3, 3, 3]);
  for (const [glyphs, n] of [[[], 0], [['echo'], 1], [['echo', 'echo'], 2], [['echo', 'echo', 'echo'], 3], [['echo', 'echo', 'echo', 'echo'], 3]]) {
    const { g } = arena(glyphs); g.fireSecondary(1000, { x: 1, y: 0 }); assert.equal(g.orrery?.halo?.n || 0, n, `${glyphs.length} echoes`);
    if (n) assert.equal(g.orrery.halo.pts.length, 3, 'a fixed set of orb places');
  }
});

test('the circling orbs burn what they touch, fire drone lasers with each press, and go when left idle', () => {
  const { g } = arena(['echo', 'echo', 'echo'], {}, []); g.fireSecondary(1000, { x: 1, y: 0 }); const h = g.orrery.halo;
  const foe = Object.assign(createCombatant('rootBrute', 0, 0), { id: 'touch', hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9, speed: 0 }); g.enemies.push(foe);
  let t = 1000; for (let i = 0; i < 60; i++) { t = frames(g, 1, idle, t, false); foe.x = h.pts[0].x - .5; foe.y = h.pts[0].y - .45; }
  assert.ok(lost(foe) > 0, 'contact damage');
  g.toolReadyAt = 0; g.fireSecondary(t, { x: 1, y: 0 }); assert.equal(of(g, 'drone').length, 3, 'one laser per orb');
  assert.ok(of(g, 'drone').every((p) => p.damageType === 'magic' && p.speed === ORRERY.drone.speed));
  t = frames(g, Math.round((ORRERY.halo.idle + .5) * 60), idle, t, false); assert.equal(g.orrery.halo, null, 'dismissed when idle');
});

test('charging spreads the orbs into a triangle of energy that burns foes inside or touching it; beams stack', () => {
  const pts = [{ x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  assert.ok(inTriangle(0, .3, 0, -1, 1, 1, -1, 1)); assert.ok(!inTriangle(3, 3, 0, -1, 1, 1, -1, 1));
  assert.equal(beamsTouching(0, .3, .1, pts, 3, null), 1, 'inside');
  assert.equal(beamsTouching(0, 1, .1, pts, 3, null), 1, 'on one edge');
  assert.equal(beamsTouching(0, -1, .1, pts, 3, null), 2, 'at a corner, two edges');
  assert.equal(beamsTouching(0, -1, .1, pts, 3, { ax: -2, ay: -1, bx: 2, by: -1 }), 3, 'and the tether');
  assert.equal(beamsTouching(5, 5, .1, pts, 3, null), 0); assert.ok(segDist(0, 1, -1, 0, 1, 0) === 1);
  // in the game: a foe behind the Wayfarer (outside the cone), within the triangle
  const { g } = arena(['echo', 'echo', 'echo'], {}, [[8.85, 10]]); g.fireSecondary(1000, { x: 1, y: 0 }); const before = lost(g.enemies[0]);
  g.toolReadyAt = 1e12; let t = frames(g, 1, input('tool', 'tool'), 1100); g.save.lastAim = { x: 1, y: 0 }; t = frames(g, 60, input(null, 'tool'), t);
  const c = g.orrery.charge; assert.ok(c);
  const o = { x: 10.5, y: 10.45 }, e = g.enemies[0]; assert.ok(!inCone(e.x + .5, e.y + .45, o.x, o.y, c.dir.x, c.dir.y, ORRERY.cone.range, ORRERY.cone.half, .38), 'not the cone');
  assert.ok(lost(e) > before, 'the triangle burned it');
});

test('release with orbs: one laser per orb, right angles (a blocky path), two hits each, seeking different foes', () => {
  const { g } = arena(['echo', 'echo', 'echo'], {}, [[13, 10], [13, 12.5], [13, 7.5]]); g.fireSecondary(1000, { x: 1, y: 0 }); g.toolReadyAt = 1e12;
  let t = frames(g, 1, input('tool', 'tool'), 1100); t = frames(g, 30, input(null, 'tool'), t); t = frames(g, 1, idle, t);
  const cubes = of(g, 'cube'); assert.equal(cubes.length, 3, 'three lasers');
  const heads = cubes.map((p) => [[p.dx, p.dy]]), combos = new Map(), targets = new Set();
  for (let i = 0; i < 200 && of(g, 'cube').length; i++) { t = frames(g, 1, idle, t); for (const [k, p] of cubes.entries()) { const last = heads[k].at(-1); if (Math.hypot(p.dx - last[0], p.dy - last[1]) > 1e-6) heads[k].push([p.dx, p.dy]); combos.set(p.id, p.combo); if (p.cube.targetId) targets.add(p.cube.targetId); } }
  for (const h of heads) { assert.ok(h.length >= 2, `turned ${h.length - 1} times`); for (let i = 1; i < h.length; i++) assert.ok(Math.abs(h[i][0] * h[i - 1][0] + h[i][1] * h[i - 1][1]) < 1e-6, 'each turn a right angle'); }
  assert.ok([...combos.values()].filter((c) => c >= 2).length >= 2, `two-hit combos: ${[...combos.values()]}`);
  assert.ok(targets.size >= 2, 'different foes sought');
  // a lone foe: the laser comes back through the same one
  const { g: s } = arena(['echo'], {}, [[13, 10]]); s.fireSecondary(1000, { x: 1, y: 0 }); s.toolReadyAt = 1e12;
  let u = frames(s, 1, input('tool', 'tool'), 1100); u = frames(s, 30, input(null, 'tool'), u); u = frames(s, 1, idle, u);
  const one = of(s, 'cube')[0]; for (let i = 0; i < 200 && !one.dead; i++) u = frames(s, 1, idle, u); assert.equal(one.combo, 2, 'through it and back through it'); assert.ok(one.cube.turns >= 2, `a blocky path: ${one.cube.turns} corners`); const c = one.cube.corners; for (let i = 2; i < c.length; i++) { const a = [c[i - 1].x - c[i - 2].x, c[i - 1].y - c[i - 2].y], b = [c[i].x - c[i - 1].x, c[i].y - c[i - 1].y]; assert.ok(Math.abs(a[0] * b[0] + a[1] * b[1]) < 1e-6 * Math.hypot(...a) * Math.hypot(...b) + 1e-6, 'square corners'); }
});

test('Shadow Clone: its own orb fires straight two-hit lasers; while charging a tether burns what it touches', () => {
  const { g } = arena([], {}, [[13, 10]]); g.shadowClone = { ox: 0, oy: 2.5, until: 1e12 };
  g.fireSecondary(1000, { x: 1, y: 0 }); const laser = of(g, 'clone')[0]; assert.ok(laser && laser.damageType === 'magic', 'the clone fires');
  assert.equal(g.projectiles.filter((p) => p.shadow && !p.orrery).length, 0, 'no ordinary shot copy');
  let t = 1000; const before = lost(g.enemies[0]); for (let i = 0; i < 60 && !laser.dead; i++) t = frames(g, 1, idle, t);
  assert.equal(laser.combo, 2, 'two hits'); assert.ok(lost(g.enemies[0]) - before >= laser.damage * 2 - 2);
  assert.equal(g.orrery.halo, null, 'not part of a triangle (no Echo here)');
  // the tether: a foe between the Wayfarer and the clone, behind the aim
  const { g: h } = arena([], {}, [[10, 11.2]]); h.shadowClone = { ox: 0, oy: 2.5, until: 1e12 }; h.toolReadyAt = 1e12; h.save.lastAim = { x: -1, y: -1 };
  let u = frames(h, 1, input('tool', 'tool'), 1000); u = frames(h, 40, input(null, 'tool'), u); h.save.lastAim = { x: -1, y: -1 };
  const e = h.enemies[0], before2 = lost(e); u = frames(h, 30, input(null, 'tool'), u); assert.ok(lost(e) > before2, 'the tether burned it');
});

test('bounded: 60 s of every press and charge with the cooldown wiped each frame stays within the caps, with no NaN', () => {
  const foes = Array.from({ length: 10 }, (_, i) => [12 + (i % 5), 8 + Math.floor(i / 5) * 3]);
  const { g } = arena(['echo', 'echo', 'echo'], { Focus: 300 }, foes); g.shadowClone = { ox: -1, oy: 1.5, until: 1e12 };
  for (const e of g.enemies) { e.hp = e.maxHp = 1e12; }
  let t = 1000, peak = 0, pellets = 0, lasers = 0, bigs = 0;
  for (let f = 0; f < 60 * 60; f++) {
    g.toolReadyAt = 0; if (f % 900 === 0) g.orreryLockUntil = 0;
    const phase = f % 50, inp = phase === 0 ? input('tool', 'tool') : phase < 45 ? input(f % 7 ? null : 'tool', 'tool') : input('tool', null);
    t = frames(g, 1, inp, t);
    peak = Math.max(peak, g.projectiles.length); pellets = Math.max(pellets, of(g, 'pellet').length); lasers = Math.max(lasers, of(g, 'cube').length, of(g, 'drone').length, of(g, 'clone').length); bigs = Math.max(bigs, of(g, 'big').length);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp), 'no NaN health');
    for (const p of g.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.damage), 'no NaN shot');
  }
  assert.ok(peak <= 32, `dungeon cap: ${peak}`); assert.ok(pellets <= ORRERY.caps.pellets); assert.ok(lasers <= ORRERY.caps.lasers); assert.ok(bigs <= ORRERY.caps.bigs);
  assert.ok(g.orrery.halo.pts.length === 3 && (g.orrery.halo.n || 0) <= 3);
  assert.ok(g.enemies.some((e) => e.maxHp - e.hp > 0));
});

test('clean: a pause drops a held charge, death and Wayglass travel dismiss the orbs, the overload clock pauses and resumes', () => {
  assert.ok(GAME_CLOCKS.includes('orreryLockUntil') && RESUME_GAME_CLOCKS.includes('orreryLockUntil'));
  const { g } = arena(['echo', 'echo']); g.fireSecondary(1000, { x: 1, y: 0 }); g.toolReadyAt = 1e12;
  let t = frames(g, 1, input('tool', 'tool'), 1100); t = frames(g, 30, input(null, 'tool'), t);
  g.setPaused(true, t); assert.equal(g.orrery.charge, null, 'dropped'); const bigs = of(g, 'big').length;
  g.setPaused(false, t + 5000); t = frames(g, 2, idle, t + 5000); assert.equal(of(g, 'big').length, bigs, 'never released by the pause');
  g.orreryLockUntil = t + 4000; g.setPaused(true, t); g.setPaused(false, t + 10000); assert.equal(g.orreryLockUntil, t + 14000, 'the overload waits out a pause');
  const saved = g.resumeRuntime(t + 10000); assert.equal(saved.clocks['game.orreryLockUntil'], 4000);
  const { g: r } = arena(); r.restoreRuntime(saved, 50000); assert.equal(r.orreryLockUntil, 54000, 'exact resume keeps the overload');
  assert.equal(r.orrery ?? null, null, 'circling orbs are not saved: dismissed on reload');
  g.clearCarriedStates(); assert.equal(g.orrery, null, 'death and Wayglass travel (clearCarriedStates)');
  const { g: m } = arena(['echo']); m.fireSecondary(1000, { x: 1, y: 0 }); m.orreryWhere = () => 'elsewhere'; frames(m, 1, idle, 1100); assert.equal(m.orrery.halo, null, 'a new floor dismisses them');
  const { g: u } = arena(['echo']); u.fireSecondary(1000, { x: 1, y: 0 }); u.save.equipment.secondary = null; frames(u, 1, idle, 1100); assert.equal(u.orrery.halo, null, 'unequipped');
});

test('a headless render draws every part (charge cone, triangle, clone orb and tether, shots, lockout) at every quality and with reduced motion', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { for (const v of a) assert.ok(typeof v !== 'number' || Number.isFinite(v), `${String(k)} got ${v}`); calls.push(k); }), set: (t, k, v) => { t[k] = v; return true; } });
  const { g } = arena(['echo', 'echo', 'echo'], {}, [[13, 10], [13, 12]]); g.shadowClone = { ox: 0, oy: 2, until: 1e12 };
  g.fireSecondary(1000, { x: 1, y: 0 }); g.toolReadyAt = 0; g.fireSecondary(1500, { x: 1, y: 0 });
  let t = frames(g, 20, idle, 1500); t = frames(g, 1, input('tool', 'tool'), t); t = frames(g, 40, input(null, 'tool'), t); g.orreryLockUntil = t + 3000;
  for (const presentation of [undefined, { effectiveQuality: 'low' }, { effectiveQuality: 'full' }, { effectiveQuality: 'balanced', reduceMotion: true }]) {
    g.presentation = presentation; const n = calls.length; drawOrrery(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 2.5); assert.ok(calls.length > n);
  }
  t = frames(g, 1, idle, t); g.presentation = undefined; drawOrrery(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 3); // the release in flight
  assert.ok(calls.includes('arc') && calls.includes('lineTo'));
  assert.doesNotThrow(() => drawOrrery(ctx, { projectiles: [], player: { x: 0, y: 0 } }, (q) => [q.x, q.y], 40, 0), 'no Orrery state');
});

test('the cooldowns and the press: tickOrrery and orreryPress run without the Game update loop', () => {
  const { g } = arena(['echo']); assert.equal(orreryPress(g, 1000, { x: 0, y: 1 }, 'tool'), true); assert.ok(g.orrery.charge && g.orrery.halo);
  tickOrrery(g, .1, 1100, true); assert.ok(g.orrery.charge.held > 0); tickOrrery(g, .016, 1116, false); assert.equal(g.orrery.charge, null);
});
