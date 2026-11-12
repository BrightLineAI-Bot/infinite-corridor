// Continuous Assault (Tim, 2026-11-12: "a passive for the Carbine called Continuous Assault: when you charge up and fire the
// beam, three lasers come down from the sky and track into the enemy, boom boom boom, similar to the Hammerfall"). A Lattice tool
// form (`field:continuous-assault`) that works only with the Carbine (a Spark Coil at +CARBINE_RANK); tool-forms.ts
// CONTINUOUS_ASSAULT holds its numbers; game.ts assaultVolley / tickCarbine run it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItemUpgrade, CARBINE_RANK } from '../src/items.ts';
import { TOOL_FORMS, TOOL_FORM_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { toggleLatticePassive, latticePassiveGroups } from '../src/constellation.ts';
import { CARBINE, CONTINUOUS_ASSAULT, assaultCharged, carbineFill, drawCarbine } from '../src/tool-forms.ts';
import { freshSave, migrateSave } from '../src/types.ts';

import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { ensureLattice } from '../src/transit-lattice.ts';

const W = 40;
function arena({ foes = [], finesse = 30, item = coil(CARBINE_RANK), passives = [] } = {}) {
  const s = freshSave(); s.seed = 'ASSAULT'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; s.stats.Finesse = finesse; ensureLattice(s);
  s.lattice.passives = passives; s.equipment.secondary = item; s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, aggro: false }));
  return { s, g };
}
const input = (held = () => false) => ({ state: { x: 0, y: 0 }, consume: () => false, held });
function run(g, frames, t, inp = input()) { for (let i = 0; i < frames; i++) { t += 50; g.update(.05, inp, t); g.player.x = 3; g.player.y = 9.55; } return t; }
function charge(g, t, seconds) {
  let down = true; const inp = input(() => down), before = new Set(g.projectiles);
  assert.equal(g.fireSecondary(t, { x: 1, y: 0 }, 'tool'), true);
  t = run(g, Math.round(seconds / .05), t, inp); down = false; t = run(g, 1, t, inp);
  return { t, beam: g.projectiles.find((p) => p.carbine && !p.shadow && !p.echo && !before.has(p)) };
}
const KEY = 'field:continuous-assault', A = CONTINUOUS_ASSAULT;
const lances = (g) => g.effects.filter((f) => f.kind === 'assault-lance');
const coil = (rank) => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + rank, upgradeRank: rank });
const on = (o = {}) => arena({ passives: [KEY], ...o });
const full = CARBINE.charge.full + .1;

test('a Lattice tool form, listed with the tools; numbers in CONTINUOUS_ASSAULT', () => {
  assert.ok(TOOL_FORMS['continuous-assault']); assert.ok(TOOL_FORM_KEYS.includes(KEY)); assert.equal(fieldForm(KEY).name, 'Continuous Assault');
  assert.ok(latticePassiveGroups().find((x) => x.id === 'tools').keys.includes(KEY));
  assert.equal(A.count, 3); assert.ok(A.gap >= .15 && A.gap <= .25); assert.ok(A.share >= .5 && A.share <= .7); assert.equal(A.radius, 1); assert.ok(A.threshold > 0 && A.threshold <= 1);
  assert.match(TOOL_FORMS['continuous-assault'].text, /Carbine/);
  // Drawn in from the Lattice like any tool form, and out again; it round-trips through a save.
  const { s } = arena(); assert.equal(toggleLatticePassive(s, KEY).ok, true); assert.ok(migrateSave(JSON.parse(JSON.stringify(s))).lattice.passives.includes(KEY));
  assert.equal(toggleLatticePassive(s, KEY).ok, true); assert.ok(!s.lattice.passives.includes(KEY));
  const closed = freshSave(); assert.equal(toggleLatticePassive(closed, KEY).ok, false, 'a closed Lattice takes nothing');
});

test('three lasers per charged release only: none for a tap, a charge below the threshold, or without the passive', () => {
  assert.equal(assaultCharged(0), false); assert.equal(assaultCharged(CARBINE.charge.grace + .01), false);
  const half = CARBINE.charge.grace + A.threshold * (CARBINE.charge.full - CARBINE.charge.grace);
  assert.equal(assaultCharged(half + .001), true); assert.ok(carbineFill(half + .001) >= A.threshold);
  { const { g } = on({ foes: [[12, 9.1]] }); g.fireSecondary(1000, { x: 1, y: 0 }); run(g, 20, 1000); assert.equal(lances(g).length, 0, 'tap'); }
  { const { g } = on({ foes: [[12, 9.1]] }); const { t } = charge(g, 1000, .4); run(g, 20, t); assert.equal(lances(g).length, 0, 'below the threshold'); }
  { const { g } = arena({ foes: [[12, 9.1]] }); const { t } = charge(g, 1000, full); run(g, 20, t); assert.equal(lances(g).length, 0, 'no passive'); }
  { const { g } = on({ foes: [[12, 9.1]] }); charge(g, 1000, .9); assert.ok(lances(g).length <= 3); run(g, 2, 3000); assert.equal(lances(g).length, 3, 'past the threshold'); }
  // Exactly three, with an Echo glyph, the clone and an awakened fan: only the beam itself calls them.
  const item = coil(CARBINE_RANK); item.glyphs = ['echo', 'echo']; item.awakened = { resonance: 'afterimage', version: 1 };
  const { g } = on({ foes: [[12, 9.1], [12, 6.1], [12, 13.1]], item }); const { t } = charge(g, 1000, full); run(g, 6, t);
  assert.equal(new Set(g.effects.filter((f) => f.kind === 'assault-lance').map((f) => f.id)).size, 3);
});

test('timing: the first lands lead s after the volley, then one every gap s; Hammerfall\'s delay-then-blow', () => {
  const { g } = on({ foes: [[10, 9.1]] }); const { t } = charge(g, 1000, full);
  // The beam crosses 7 tiles in under a frame or two; the volley is called the frame it strikes.
  let now = t, called = null; for (let i = 0; i < 6 && called === null; i++) { if (lances(g).length) called = now; now = run(g, 1, now); }
  assert.ok(called !== null); const L = lances(g).slice().sort((a, b) => a.delay - b.delay);
  assert.equal(L.length, 3); assert.ok(L[0].delay <= A.lead + 1e-9 && L[0].delay >= A.lead - .1 - 1e-9, `first: ${L[0].delay}`);
  for (let i = 1; i < 3; i++) assert.ok(Math.abs(L[i].delay - L[0].delay - A.gap * i) < 1e-9, `laser ${i}: ${L[i].delay}`);
  // Each strikes once, at its time: count the blows as they land.
  const e = g.enemies[0]; let hp = e.hp, blows = [];
  for (let i = 0; i < 30; i++) { now = run(g, 1, now); if (e.hp < hp) blows.push(now); hp = e.hp; }
  assert.equal(blows.length, 3, 'boom boom boom'); for (let i = 1; i < 3; i++) { const d = (blows[i] - blows[i - 1]) / 1000; assert.ok(d >= A.gap - .051 && d <= A.gap + .051, `gap ${d}`); }
  assert.equal(lances(g).length, 0, 'gone once their rings fade');
});

test('tracking and target choice: the struck foe, followed as it moves; else the foe nearest where the beam ended; else that point', () => {
  { // The struck foe walks away: every laser lands on it.
    const { g } = on({ foes: [[10, 9.1], [11, 12.1]] }); const { t } = charge(g, 1000, full); let now = run(g, 1, t);
    const foe = g.enemies[0], other = g.enemies[1]; assert.ok(lances(g).every((L) => L.track === 'foe0'));
    for (let i = 0; i < 20; i++) { foe.y += .05; now = run(g, 1, now); for (const L of lances(g)) if (L.delay > 0) assert.ok(Math.hypot(L.x - foe.x - .5, L.y - foe.y - .45) < .6 + 1e-9, 'it tracks'); }
    assert.ok(1e9 - foe.hp > 0); assert.equal(other.hp, 1e9, 'a foe 3 tiles off is untouched');
  }
  { // A beam that strikes nothing (fired into the empty half of the room): the foe nearest where it ended, within seek.
    const { g, s } = on({ foes: [[3 + 16 * 0 + 2, 15.1]] }); s.lastAim = { x: 0, y: -1 }; g.enemies[0].x = 3; g.enemies[0].y = 9.55 - 16 - 1; // off the map end: none in reach
    g.enemies = []; const { t } = charge(g, 1000, full); run(g, 8, t); const L = lances(g);
    assert.equal(L.length, 3, 'still called, on the point'); assert.ok(L.every((q) => q.track === ''));
  }
  { const { g } = on({ foes: [[20.4, 11.6]] }); // the beam runs 2 tiles above it, missing, and ends within seek of it
    let down = true; const inp = input(() => down); g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); g.lockedDirection = () => ({ x: 1, y: 0 }); let t = run(g, Math.round(full / .05), 1000, inp); down = false; t = run(g, 8, t, inp);
    const L = lances(g); assert.equal(L.length, 3); assert.ok(L.every((q) => q.track === 'foe0'), 'the nearest foe within seek of its end');
  }
  { // The foe falls before the lasers land: they turn to the next nearest within seek.
    const { g } = on({ foes: [[10, 9.1], [11, 10.1]] }); const { t } = charge(g, 1000, full); let now = run(g, 1, t);
    g.enemies[0].dead = true; g.enemies[0].hp = 0; now = run(g, 1, now); assert.ok(lances(g).every((q) => q.track === 'foe1'));
  }
});

test('damage and radius: each laser hits everything within 1 tile for share × the charged beam; grows with Finesse', () => {
  const { g } = on({ foes: [[10, 9.1], [10.8, 9.1], [12.3, 9.1]] }); const { t, beam } = charge(g, 1000, full);
  const before = g.enemies.map((e) => e.hp); run(g, 2, t); const afterBeam = g.enemies.map((e) => e.hp);
  run(g, 30, t + 100); const fromLasers = g.enemies.map((e, i) => afterBeam[i] - e.hp);
  const beamLoss = before[0] - afterBeam[0], per = beamLoss * A.share; // both land through the same Wayfarer damage scale
  assert.ok(beamLoss > 0 && beam.damage > 0); assert.ok(fromLasers[1] > 0, 'the foe beside it, within the radius'); assert.equal(fromLasers[2], 0, 'a foe 2.3 tiles off is outside');
  assert.ok(Math.abs(fromLasers[0] - 3 * per) <= 3 * per * .02 + 3, `three blows of ${per}: ${fromLasers[0]}`);
  const tot = (finesse) => { const { g: q } = on({ foes: [[10, 9.1]], finesse }); const r = charge(q, 1000, full); run(q, 30, r.t); return 1e9 - q.enemies[0].hp; };
  assert.ok(tot(60) > tot(10) * 1.5, 'Stamina scales it');
});

test('bounds: at most maxLive lasers, from a fixed pool that never grows; 60 s of charged releases every frame stays finite', () => {
  const { g, s } = on({ foes: [[8, 9.1], [10, 10.1], [12, 8.1], [14, 9.1]] }); s.rounds.loaded = 1e6; let t = 1000, down = true, most = 0; const inp = input(() => down);
  g.carbineState(); const pool = g.carbine.lances; assert.equal(pool.length, A.maxLive);
  for (let i = 0; i < 1200; i++) {
    g.player.attackReadyAt = 0; if (!g.carbine.charge) { down = true; g.fireSecondary(t, { x: 1, y: Math.sin(i) * .2 }, 'tool'); }
    if (g.carbine.charge && g.carbine.charge.held >= CARBINE.charge.full * .7) down = false; // release at about 3/4 full, past the threshold
    t += 50; g.update(.05, inp, t); g.player.x = 3; g.player.y = 9.55;
    const L = lances(g); most = Math.max(most, L.length); assert.ok(L.length <= A.maxLive);
    for (const q of L) { assert.ok(pool.includes(q), 'every laser is a pool slot'); assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.delay) && q.damage >= 1); assert.ok(Object.keys(q.hits).length <= 8); }
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
    assert.ok(g.effects.length <= A.maxLive + 8, `effects ${g.effects.length}`);
  }
  assert.equal(g.carbine.lances, pool); assert.equal(pool.length, A.maxLive); assert.ok(most >= 3, `peak ${most}`);
  // A direct volley past the cap calls only the room left.
  const { g: c } = on({ foes: [[10, 9.1]] }); for (let i = 0; i < 5; i++) c.assaultVolley(10.5, 9.55, null, 100); assert.equal(lances(c).length, A.maxLive);
});

test('the Carbine only: a Spark Coil below the rank, the Lumen Spindle or any other tool never calls a laser', () => {
  for (const item of [coil(CARBINE_RANK - 1), normalizeItemUpgrade({ id: 'secondary-lumen-spindle', name: 'Lumen Spindle', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], power: 20 })]) {
    const { g } = on({ foes: [[10, 9.1]], item }); let down = true; const inp = input(() => down); g.fireSecondary(1000, { x: 1, y: 0 }, 'tool');
    let t = run(g, 30, 1000, inp); down = false; t = run(g, 30, t, inp); assert.equal(lances(g).length, 0, item.name); assert.equal(g.carbine?.lances, undefined);
  }
});

test('drawing: rings, the falling lasers and the strike draw finite in the standard view; on the Close View floor no sky beam', () => {
  const { g } = on({ foes: [[10, 9.1]] }); const { t } = charge(g, 1000, full); let now = run(g, 1, t);
  const calls = { stroke: 0, lineTo: 0, ellipse: 0 };
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { if (k in calls) calls[k]++; for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} got ${v}`); }, set: (o, k, v) => { o[k] = v; return true; } });
  const toScreen = (q) => [q.x * 40, q.y * 40 + 400];
  for (let i = 0; i < 16; i++) { drawCarbine(ctx, g, toScreen, 40, now / 1000); drawCarbine(ctx, g, toScreen, 40, now / 1000, { has: () => false }); now = run(g, 1, now); }
  assert.ok(calls.stroke > 10 && calls.lineTo > 5 && calls.ellipse > 0, JSON.stringify(calls));
  // With a capture (Close View's floor) the vertical beams are left to Close View: fewer lines.
  const { g: h } = on({ foes: [[10, 9.1]] }); const r = charge(h, 1000, full); run(h, 6, r.t); const a = { lineTo: 0 }, b = { lineTo: 0 };
  const counter = (c) => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { if (k in c) c[k]++; }, set: (o, k, v) => { o[k] = v; return true; } });
  drawCarbine(counter(a), h, toScreen, 40, 1); drawCarbine(counter(b), h, toScreen, 40, 1, { has: () => false }); assert.ok(b.lineTo < a.lineTo, `${b.lineTo} < ${a.lineTo}`);
});
