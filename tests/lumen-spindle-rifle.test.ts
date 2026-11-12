// Lumen Carbine (Tim, 2026-11-12): "maybe we can make a passive for the Lumen Spindle that turns it into an energy rifle...
// instead of getting another weapon... it'll have to scale with magic"; "one powerful shot and then another powerful shot, kind
// of like a sniper... you can charge it up and shoot it... enemies far away that my tracker had locked on". A Lattice tool form
// (`field:lumen-carbine`); tool-forms.ts LUMEN_CARBINE holds its numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, TARGET_LOCK } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade, RANGED_WEAPONS } from '../src/items.ts';
import { ensureLattice, latticeOpen } from '../src/transit-lattice.ts';
import { TOOL_FORMS, TOOL_FORM_KEYS, fieldForm, fieldOn } from '../src/lattice-fields.ts';
import { toggleLatticePassive, latticePassiveGroups } from '../src/constellation.ts';
import { LUMEN_CARBINE, carbineFill, carbineShare, carbinePierce, carbineRounds, carbineAffordedHold, drawCarbine, roundsLabel } from '../src/tool-forms.ts';
import { CLOSE_VIEW } from '../src/close-view.ts';
import { closeViewHeldMuzzleLocal } from '../src/close-view-models.ts';
import { standardProjectile, standardProjectileColor } from '../src/combat-visuals.ts';

const KEY = 'field:lumen-carbine';
const W = 40;
const spindle = (extra = {}) => normalizeItemUpgrade({ id: 'secondary-lumen-spindle', name: 'Lumen Spindle', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], power: 20, upgradeRank: 4, ...extra });
// An open room 40 tiles wide; the Wayfarer at x = 3, foes on the same row.
function arena({ passive = true, foes = [], focus = 30, might = 1, item = {} } = {}) {
  const s = freshSave(); s.seed = 'CARBINE'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; s.stats.Focus = focus; s.stats.Might = might; ensureLattice(s);
  s.lattice.passives = passive ? [KEY] : []; s.equipment.secondary = spindle(item); s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; g.enemies = []; Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, aggro: false }));
  return { s, g };
}
const input = (held = () => false) => ({ state: { x: 0, y: 0 }, consume: () => false, held });
function run(g, frames, t, inp = input(), keep = true) { for (let i = 0; i < frames; i++) { t += 50; g.update(.05, inp, t); if (keep) { g.player.x = 3; g.player.y = 9.55; } } return t; }
const lost = (g) => g.enemies.map((e) => 1e9 - e.hp);
// A charge held `seconds` and released: returns the beam.
function charge(g, t, seconds) {
  let down = true; const inp = input(() => down), before = new Set(g.projectiles);
  assert.equal(g.fireSecondary(t, { x: 1, y: 0 }, 'tool'), true, 'the press starts a charge');
  assert.equal(g.projectiles.filter((p) => !before.has(p)).length, 0, 'nothing fires on the press');
  const frames = Math.round(seconds / .05); t = run(g, frames, t, inp);
  down = false; t = run(g, 1, t, inp);
  return { t, beam: g.projectiles.find((p) => p.carbine && !p.shadow && !p.echo && !before.has(p)) };
}

test('the Lumen Carbine is a Lattice tool form, its numbers in LUMEN_CARBINE, scaling with Magic', () => {
  assert.ok(TOOL_FORMS['lumen-carbine']); assert.ok(TOOL_FORM_KEYS.includes(KEY)); assert.equal(fieldForm(KEY).name, 'Lumen Carbine');
  assert.equal(LUMEN_CARBINE.scale, 'magic'); assert.equal(LUMEN_CARBINE.tool, 'Lumen Spindle');
  for (const k of ['range', 'speed', 'cadence']) assert.ok(LUMEN_CARBINE[k] > 0, k);
  for (const k of ['grace', 'full', 'min', 'max', 'pierce', 'rounds']) assert.ok(LUMEN_CARBINE.charge[k] > 0, k);
  assert.match(TOOL_FORMS['lumen-carbine'].text, /Magic \(Focus\)/); assert.match(TOOL_FORMS['lumen-carbine'].text, new RegExp(`${LUMEN_CARBINE.range} tiles`));
  assert.ok(latticePassiveGroups().find((x) => x.id === 'tools').keys.includes(KEY), 'listed with the tool forms in the Lattice');
});

test('without the passive the Lumen Spindle fires exactly as before', () => {
  const { g: a } = arena({ passive: false }), { g: b } = arena({ passive: false });
  b.save.lattice.passives = ['field:lumen-sunburst']; b.save.lattice.passives = []; // nothing left set
  assert.equal(a.carbineOn(), false);
  assert.equal(a.fireSecondary(1000, { x: 1, y: 0 }, 'tool'), true); const shot = a.projectiles[0], W8 = RANGED_WEAPONS['secondary-lumen-spindle'];
  assert.equal(shot.path, 'boomerang'); assert.equal(shot.speed, W8.speed); assert.equal(shot.damageType, 'magic'); assert.equal(shot.carbine, undefined); assert.equal(shot.bx, undefined);
  assert.equal(a.carbine, undefined, 'no carbine state'); assert.equal(a.player.attackReadyAt, 1000 + 360, 'the Spindle cadence');
  // A held tool button changes nothing: the next press is accepted as soon as the Spindle recovers.
  a.player.attackReadyAt = 0; assert.equal(a.fireSecondary(1400, { x: 1, y: 0 }, 'tool'), true); assert.equal(a.projectiles.length, 2);
  // And the same shot with the Carbine set but another tool held: the Carbine only changes the Spindle.
  const { g: c } = arena({ item: { id: 'secondary-needle-caster', name: 'Needle Caster', property: 'quick', upgradeRank: 0 } });
  assert.equal(c.carbineOn(), false); c.fireSecondary(1000, { x: 1, y: 0 }); assert.equal(c.projectiles[0].carbine, undefined);
});

test('tap: one beam, far past the Blunderbuss, to any foe the lock can hold, for several Spindle shots', () => {
  const W8 = RANGED_WEAPONS['secondary-lumen-spindle'], BB = RANGED_WEAPONS['secondary-blunderbuss'];
  const reach = LUMEN_CARBINE.range, blunder = BB.speed * BB.lifetime, spindleOut = W8.speed * W8.turnAfter;
  assert.ok(reach >= TARGET_LOCK.range, 'every locked target is in reach'); assert.ok(reach >= CLOSE_VIEW.lock.range + CLOSE_VIEW.lock.slack, 'past the Close View lock');
  assert.ok(reach > blunder * 1.3 && reach > spindleOut * 1.8, `${reach} tiles vs Blunderbuss ${blunder.toFixed(1)} and Spindle ${spindleOut}`);
  // A Spindle shot and a Carbine tap on the same Wayfarer.
  const { g: plain } = arena({ passive: false }); plain.fireSecondary(1000, { x: 1, y: 0 }); const one = plain.projectiles[0].damage;
  const { g, s } = arena({ foes: [[3 + 15, 9.1], [3 + 15.6, 9.1]] });
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true, 'auto attack (no held button) fires at once'); const beam = g.projectiles[0];
  assert.ok(beam.carbine && beam.path === 'straight' && beam.damageType === 'magic' && beam.glyphHost === 'tool');
  assert.equal(beam.damage, Math.round(one * LUMEN_CARBINE.tap.share)); assert.equal(beam.pierce, 0);
  assert.ok(Math.abs(beam.speed * beam.life - reach) < 1e-9 && beam.life <= .25, 'crosses its reach in a fifth of a second');
  run(g, 8, 1000); const [near, behind] = lost(g);
  assert.ok(near > 0 && behind === 0, `strikes the first foe 15 tiles off and stops (${near}, ${behind})`);
  assert.equal(s.rounds.loaded, LUMEN_CARBINE.tap.rounds === 1 ? 39 : 40 - LUMEN_CARBINE.tap.rounds);
  // A tap through the held button fires on release (below the grace), and auto aim finds a far foe.
  const { g: h } = arena({ foes: [[3 + 14, 12.1]] }); let down = true; const inp = input(() => down);
  h.fireSecondary(5000, { x: 1, y: 0 }, 'tool'); down = false; run(h, 1, 5000, inp); const tap = h.projectiles[0];
  assert.ok(tap && tap.carbine && tap.charge === 0 && tap.dy > 0, 'released at once: a tap beam, aimed at the foe 14 tiles off');
});

test('cadence: one beam every LUMEN_CARBINE.cadence s, slower than any other firing tool', () => {
  const { g } = arena(); assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true);
  assert.equal(g.player.attackReadyAt, 1000 + LUMEN_CARBINE.cadence * 1000);
  assert.equal(g.fireSecondary(1000 + LUMEN_CARBINE.cadence * 1000 - 1, { x: 1, y: 0 }), false, 'refused while it recovers');
  assert.equal(g.fireSecondary(1000 + LUMEN_CARBINE.cadence * 1000, { x: 1, y: 0 }), true);
  assert.ok(LUMEN_CARBINE.cadence >= .36 * 2.5, 'a sniper: at least 2.5× the Spindle\'s cadence');
  // A charge release starts the same recovery.
  const { g: c } = arena(); const { t } = charge(c, 1000, .6); assert.ok(c.player.attackReadyAt >= t + LUMEN_CARBINE.cadence * 1000 - 1);
});

test('charge: the share rises from min to max between grace and full, then holds (the cap); pierce and rounds follow it', () => {
  const C = LUMEN_CARBINE.charge, tap = LUMEN_CARBINE.tap.share;
  assert.ok(C.full >= 1 && C.full <= 1.5, 'full in about 1 to 1.5 s');
  assert.equal(carbineShare(0), tap); assert.equal(carbineShare(C.grace - .01), tap);
  assert.equal(carbineShare(C.grace), tap * C.min); assert.equal(carbineShare(C.full), tap * C.max); assert.equal(carbineShare(C.full * 5), tap * C.max, 'holding longer adds nothing');
  let prev = 0; for (let h = 0; h <= 3; h += .05) { const v = carbineShare(h); assert.ok(v >= prev - 1e-12 && Number.isFinite(v)); prev = v; }
  assert.ok(tap * C.max <= 8, 'a full charge is a strong hit, not a boss deleter: at most 8 Spindle shots');
  assert.equal(carbinePierce(0), 0); assert.equal(carbinePierce(C.full), C.pierce); assert.equal(carbineFill(99), 1);
  assert.deepEqual([0, C.grace + .01, (C.grace + C.full) / 2, C.full - .01, C.full, 9].map(carbineRounds), [1, 2, 2, 3, 3, 3]);
  // In the game: a full charge pierces through C.pierce foes into a third; the cap holds however long it is held.
  const { g } = arena({ foes: [[10, 9.1], [12, 9.1], [14, 9.1], [16, 9.1]] });
  const { beam } = charge(g, 1000, C.full + 2);
  const { g: p } = arena({ passive: false }); p.fireSecondary(1000, { x: 1, y: 0 }); const one = p.projectiles[0].damage;
  assert.equal(beam.charge, 1); assert.equal(beam.pierce, C.pierce); assert.equal(beam.damage, Math.round(one * tap * C.max));
  run(g, 8, 4000); const hit = lost(g).map((n) => n > 0);
  assert.deepEqual(hit, [true, true, true, false], 'through two foes into a third, and no further');
  assert.ok(g.carbine.charge === null);
});

test('rounds: a tap takes 1, a charge 2 or 3; short of rounds a charge fires as full as they pay for; empowered first', () => {
  const { g, s } = arena(); s.rounds.loaded = 10; s.materials.cinderIron = 0;
  let t = charge(g, 1000, LUMEN_CARBINE.charge.full + .1).t; assert.equal(s.rounds.loaded, 7, 'a full charge: 3');
  g.player.attackReadyAt = 0; t = charge(g, t + 100, .5).t; assert.equal(s.rounds.loaded, 5, 'a part charge: 2');
  g.player.attackReadyAt = 0; g.fireSecondary(t + 100, { x: 1, y: 0 }); assert.equal(s.rounds.loaded, 4, 'a tap: 1');
  // Two rounds left: a full charge fires at half (two rounds' worth).
  s.rounds.loaded = 2; g.player.attackReadyAt = 0; g.projectiles = []; const short = charge(g, t + 3000, LUMEN_CARBINE.charge.full + .1);
  assert.equal(s.rounds.loaded, 0); assert.ok(short.beam.charge > 0 && short.beam.charge <= .5 + 1e-9, `fired at ${short.beam.charge}`); assert.match(g.message, /ran short/);
  assert.equal(carbineAffordedHold(LUMEN_CARBINE.charge.full, 1), 0, 'one round: a tap'); assert.equal(carbineRounds(carbineAffordedHold(LUMEN_CARBINE.charge.full, 2)), 2);
  // None at all: no charge starts.
  g.player.attackReadyAt = 0; assert.equal(g.fireSecondary(t + 9000, { x: 1, y: 0 }, 'tool'), false); assert.equal(g.carbine.charge, null);
  // Empowered rounds are spent first and empower the beam (×1.5).
  const { g: e, s: es } = arena(); es.rounds.empowered = 5; e.fireSecondary(1000, { x: 1, y: 0 }); const { g: o } = arena(); o.fireSecondary(1000, { x: 1, y: 0 });
  assert.equal(es.rounds.empowered, 4); assert.equal(es.rounds.loaded, 40); assert.ok(e.projectiles[0].empowered); assert.equal(e.projectiles[0].damage, Math.round(o.projectiles[0].damage * 1.5));
  assert.ok(roundsLabel(es, RANGED_WEAPONS['secondary-lumen-spindle']), 'the HUD shows the rounds');
});

test('Magic scaling: Focus raises the beam, Might does not; switching the table to physical turns it to Might', () => {
  const tap = (o) => { const { g } = arena(o); g.fireSecondary(1000, { x: 1, y: 0 }); return g.projectiles[0]; };
  const low = tap({ focus: 10, might: 10 }), high = tap({ focus: 60, might: 10 }), strong = tap({ focus: 10, might: 60 });
  assert.ok(high.damage > low.damage * 1.5, `Focus 10 → 60: ${low.damage} → ${high.damage}`); assert.equal(strong.damage, low.damage, 'Might adds nothing');
  assert.equal(low.damageType, 'magic');
  const was = LUMEN_CARBINE.scale; LUMEN_CARBINE.scale = 'physical';
  try {
    const pl = tap({ focus: 10, might: 10 }), pm = tap({ focus: 10, might: 60 }), pf = tap({ focus: 60, might: 10 });
    assert.equal(pl.damageType, 'physical'); assert.ok(pm.damage > pl.damage * 1.5, `Might 10 → 60: ${pl.damage} → ${pm.damage}`); assert.equal(pf.damage, pl.damage, 'Focus adds nothing');
    assert.notEqual(pl.damage, low.damage);
  } finally { LUMEN_CARBINE.scale = was; }
});

test('unlocking: drawn into an open Transit Lattice like any tool form; nothing while the Lattice is closed', () => {
  const s = freshSave(); s.seed = 'LOCKED'; ensureLattice(s); s.equipment.secondary = spindle();
  assert.equal(latticeOpen(s), false); assert.equal(toggleLatticePassive(s, KEY).ok, false, 'the Lattice is closed');
  s.lattice.passives = [KEY]; assert.equal(fieldOn(s, KEY.slice(6)), false, 'a key in a closed Lattice does nothing');
  const g = new Game(s, 0); assert.equal(g.carbineOn(), false);
  const { s: o } = arena({ passive: false }); assert.equal(toggleLatticePassive(o, KEY).ok, true); assert.ok(o.lattice.passives.includes(KEY)); assert.ok(fieldOn(o, 'lumen-carbine'));
  assert.equal(toggleLatticePassive(o, KEY).ok, true); assert.ok(!o.lattice.passives.includes(KEY), 'and taken out again');
});

test('saves: the passive round-trips through migrateSave at schema 14; an old save has none; the charge is never saved', () => {
  const { s, g } = arena(); assert.equal(s.schemaVersion ?? 14, 14);
  g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); assert.ok(g.carbine.charge);
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.ok(back.lattice.passives.includes(KEY)); assert.equal(back.carbine, undefined); assert.ok(!JSON.stringify(back).includes('"charge":{"held"'));
  const again = new Game(back, 0); assert.ok(again.carbineOn()); assert.equal(again.carbine, undefined, 'a resumed journey starts with no charge');
  const old = freshSave(); delete old.lattice; const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.ok(!(m.lattice?.passives || []).includes(KEY));
  // Unknown fields kept alongside it.
  const extra = JSON.parse(JSON.stringify(s)); extra.lattice.futureField = 7; assert.equal(migrateSave(extra).lattice.futureField, 7);
});

test('drawing: beams, afterglow and the charge draw in the standard view (and on the Close View floor); cyan, bounded', () => {
  const { g } = arena({ foes: [[12, 9.1]] }); const calls = { stroke: 0, fill: 0, arc: 0 };
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { if (k in calls) calls[k]++; for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} got ${v}`); }, set: (o, k, v) => { o[k] = v; return true; } });
  const toScreen = (q) => [q.x * 40, q.y * 40];
  g.fireSecondary(1000, { x: 1, y: 0 }); drawCarbine(ctx, g, toScreen, 40, 1); assert.ok(calls.stroke >= 2, 'the flying beam');
  assert.ok(standardProjectile(g.projectiles[0]) && standardProjectileColor(g.projectiles[0]) === LUMEN_CARBINE.colors.beam, 'the head is a standard (projected in Close View) shot, cyan');
  run(g, 6, 1000); assert.ok(g.carbine.traces.some((q) => q.life > 0), 'its afterglow'); calls.stroke = 0; drawCarbine(ctx, g, toScreen, 40, 1); assert.ok(calls.stroke >= 1);
  run(g, 10, 1300); assert.ok(g.carbine.traces.every((q) => q.life === 0), 'and it fades');
  g.player.attackReadyAt = 0; let down = true; g.fireSecondary(4000, { x: 1, y: 0 }, 'tool'); run(g, 10, 4000, input(() => down)); calls.arc = 0;
  g.presentation = { reduceMotion: true }; drawCarbine(ctx, g, toScreen, 40, 1); assert.ok(calls.arc >= 3, 'the charge glow and its ring');
  assert.equal(g.save.lastAim.x > 0, true);
  // The Spindle's drawn muzzle is where Close View latches the beam and glows the charge.
  const m = closeViewHeldMuzzleLocal('lumen-spindle'); assert.ok(m && m.every(Number.isFinite));
  assert.equal(LUMEN_CARBINE.colors.glow, 0x7fe7ff, 'an existing lit actor colour');
});

test('60 s of beams and charges every frame (cooldowns wiped): finite, bounded, never more than the caps', () => {
  const { g, s } = arena({ foes: [[10, 9.1], [14, 10.1], [18, 8.1], [22, 9.1]], item: { awakened: { resonance: 'afterimage', version: 1 } } });
  s.rounds.loaded = 1e5; let t = 1000, down = false, maxShots = 0, maxTraces = 0; const inp = input(() => down);
  for (let i = 0; i < 1200; i++) {
    g.player.attackReadyAt = 0; if (i % 7 === 0) down = !down;
    g.fireSecondary(t, { x: Math.cos(i * .29), y: Math.sin(i * .29) }, i % 3 ? 'tool' : null);
    t += 50; g.update(.05, inp, t); g.player.x = 3; g.player.y = 9.55;
    maxShots = Math.max(maxShots, g.projectiles.length); maxTraces = Math.max(maxTraces, g.carbine.traces.filter((q) => q.life > 0).length);
    for (const p of g.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.damage) && p.damage > 0);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
    const c = g.carbine.charge; if (c) assert.ok(c.held >= 0 && c.held <= LUMEN_CARBINE.charge.full + LUMEN_CARBINE.charge.grace + 1e-9 && Number.isFinite(c.dir.x));
  }
  assert.equal(g.carbine.traces.length, LUMEN_CARBINE.trace.max); assert.ok(maxTraces <= LUMEN_CARBINE.trace.max);
  assert.ok(maxShots <= 32 + 4, `shots ${maxShots}`); assert.ok(lost(g).some((n) => n > 0));
  // Put the Spindle away mid-charge: the charge is dropped, nothing fires later.
  g.player.attackReadyAt = 0; down = true; g.fireSecondary(t, { x: 1, y: 0 }, 'tool'); s.equipment.secondary = null; run(g, 2, t, inp); assert.equal(g.carbine.charge, null);
});
