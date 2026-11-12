// The Carbine (Tim, 2026-11-12): release 916's Lumen Carbine passive ("one powerful shot and then another... like a sniper...
// charge it up") becomes a tool, "a stamina weapon"; then "spark coil... no longer shows up in the rolls... spark coil can start
// dropping... similar to the blunderbuss... when you upgrade it past six, it turns into the carbine". The Spark Coil's upgraded
// form (items.ts CARBINE_RANK, the Blunderbuss's rank); tool-forms.ts CARBINE holds its numbers. The Lumen Spindle is plain again
// and `field:lumen-carbine` is retired (transit-lattice.ts RETIRED_PASSIVES).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, TARGET_LOCK, characterStats, STAMINA_BONUS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade, RANGED_WEAPONS, rangedWeapon, generateItem, isValidItem, itemMechanicalStats, BLUNDERBUSS_RANK, CARBINE_RANK, SPARK_COIL_LOOT, ITEM_TABLE } from '../src/items.ts';
import { ensureLattice, RETIRED_PASSIVES } from '../src/transit-lattice.ts';
import { TOOL_FORMS, TOOL_FORM_KEYS } from '../src/lattice-fields.ts';
import { toggleLatticePassive } from '../src/constellation.ts';
import { CARBINE, TOOL_SCALES, carbineFill, carbineShare, carbinePierce, carbineRounds, carbineAffordedHold, carbineBase, drawCarbine, roundsLabel, usesRounds } from '../src/tool-forms.ts';
import { CLOSE_VIEW } from '../src/close-view.ts';
import { closeViewHeldMuzzleLocal, closeViewHeldMuzzlePoint, writeCloseViewHeroGear, writeCloseViewHeroEquipment, CLOSE_VIEW_HERO_WEAPON_FORM, CARBINE_COLOURS, HERO_EQUIPMENT_MAX_TRIANGLES, MODEL_FLOATS } from '../src/close-view-models.ts';
import { CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES } from '../src/close-view-player-forms.ts';
import { CLOSE_VIEW_ACTOR_LOOK } from '../src/close-view-gl.ts';
import { closeViewHeldGear } from '../src/close-view-player-presentation.ts';
import { simpleToolAppearanceKind, importedEmitterAppearance } from '../src/action-motion.ts';
import { standardProjectile, standardProjectileColor } from '../src/combat-visuals.ts';
import fs from 'node:fs';

const W = 40;
const coil = (rank = CARBINE_RANK, extra = {}) => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + rank, upgradeRank: rank, ...extra });
const spindle = () => normalizeItemUpgrade({ id: 'secondary-lumen-spindle', name: 'Lumen Spindle', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], power: 20, upgradeRank: 4 });
// An open room 40 tiles wide; the Wayfarer at x = 3, foes on the same row.
function arena({ foes = [], finesse = 30, focus = 1, might = 1, item = coil(), passives = [] } = {}) {
  const s = freshSave(); s.seed = 'CARBINE'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; Object.assign(s.stats, { Finesse: finesse, Focus: focus, Might: might }); ensureLattice(s);
  s.lattice.passives = passives; s.equipment.secondary = item; s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
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
  t = run(g, Math.round(seconds / .05), t, inp);
  down = false; t = run(g, 1, t, inp);
  return { t, beam: g.projectiles.find((p) => p.carbine && !p.shadow && !p.echo && !before.has(p)) };
}

test('the Spark Coil drops again, from its own stream; every other roll of a generated item is unchanged', () => {
  assert.deepEqual(SPARK_COIL_LOOT.secondary, [['Spark Coil', 'focus']]); assert.ok(SPARK_COIL_LOOT.share > .15 && SPARK_COIL_LOOT.share <= 1 / ITEM_TABLE.secondary.length, 'about one tool in four');
  let tools = 0, coils = 0;
  for (let i = 0; i < 4000; i++) { const q = generateItem(`coil-drop-${i}`, 10); if (q.slot !== 'secondary') continue; tools++; if (q.name === 'Spark Coil') { coils++; assert.equal(q.property, 'focus'); assert.ok(isValidItem(q)); assert.equal(rangedWeapon(q).name, 'Spark Coil'); } }
  const share = coils / tools; assert.ok(share > .12 && share < .26, `Spark Coil ${(share * 100).toFixed(1)}% of tools`);
  // The stream only renames: id, power, tier and affixes are exactly the roll without it.
  for (let i = 0; i < 400; i++) { const q = generateItem(`coil-drop-${i}`, 10); if (q.name !== 'Spark Coil') continue; const was = SPARK_COIL_LOOT.share; SPARK_COIL_LOOT.share = 0; try { const p = generateItem(`coil-drop-${i}`, 10); assert.notEqual(p.name, 'Spark Coil'); assert.deepEqual({ ...q, name: p.name, property: p.property }, p); } finally { SPARK_COIL_LOOT.share = was; } }
});

test('below the rank it is still the Spark Coil; at the rank (the Blunderbuss rank) it is renamed the Carbine and fires the beam', () => {
  assert.equal(CARBINE_RANK, BLUNDERBUSS_RANK);
  const low = coil(CARBINE_RANK - 1); assert.equal(low.name, 'Spark Coil'); assert.equal(rangedWeapon(low), RANGED_WEAPONS['spark-coil']);
  const { g: a } = arena({ item: low }); assert.equal(a.carbineOn(), false); assert.equal(a.fireSecondary(1000, { x: 1, y: 0 }, 'tool'), true);
  const shot = a.projectiles[0]; assert.equal(shot.carbine, undefined); assert.equal(shot.speed, 12); assert.equal(shot.damageType, 'magic'); assert.equal(a.player.attackReadyAt, 1360, 'the coil cadence');
  assert.deepEqual(a.player.attackVisual.toolAppearance, { v: 1, kind: 'spark-coil' });
  const top = coil(CARBINE_RANK); assert.equal(top.name, 'Carbine'); assert.equal(top.id, 'spark-coil', 'keeps its id'); assert.ok(isValidItem(top));
  assert.equal(rangedWeapon(top), RANGED_WEAPONS['secondary-carbine']); assert.equal(rangedWeapon(top).carbine, true);
  // A generated coil (another id) works by name, at the rank or renamed.
  assert.equal(rangedWeapon({ id: 'secondary-4242', name: 'Spark Coil', upgradeRank: CARBINE_RANK }).carbine, true); assert.equal(rangedWeapon({ id: 'secondary-4242', name: 'Carbine' }).carbine, true);
  const st = itemMechanicalStats(top); assert.equal(st.cooldown, CARBINE.cadence); assert.equal(st.projectileRange, CARBINE.range); assert.equal(st.damage, CARBINE.base);
  assert.ok(usesRounds(rangedWeapon(top)) && usesRounds(rangedWeapon(low)));
  const { g } = arena({ foes: [[18, 9.1]] }); assert.equal(g.carbineOn(), true); assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true);
  const beam = g.projectiles[0]; assert.ok(beam.carbine && beam.path === 'straight' && beam.damageType === 'physical' && beam.glyphHost === 'tool');
  assert.deepEqual(g.player.attackVisual.toolAppearance, { v: 1, kind: 'carbine' }); assert.equal(g.player.attackVisual.toolKind, undefined);
});

test('an old starter coil upgraded to the rank becomes the Carbine through migrateSave, keeping id, ranks and glyphs', () => {
  const s = freshSave(); assert.equal(s.equipment.secondary.id, 'spark-coil'); assert.equal(s.equipment.secondary.name, 'Spark Coil');
  Object.assign(s.equipment.secondary, { upgradeRank: CARBINE_RANK, power: s.equipment.secondary.basePower + CARBINE_RANK, glyphs: ['echo'], futureField: 7 });
  const m = migrateSave(JSON.parse(JSON.stringify(s))), q = m.equipment.secondary;
  assert.equal(q.name, 'Carbine'); assert.equal(q.id, 'spark-coil'); assert.equal(q.upgradeRank, CARBINE_RANK); assert.deepEqual(q.glyphs, ['echo']); assert.equal(q.futureField, 7);
  const g = new Game(m, 0); assert.equal(g.carbineOn(), true);
  // In the pack too.
  const p = freshSave(); p.inventory.push({ ...p.equipment.secondary, upgradeRank: CARBINE_RANK + 1, power: 3 + CARBINE_RANK + 1 }); assert.equal(migrateSave(JSON.parse(JSON.stringify(p))).inventory.at(-1).name, 'Carbine');
});

test('tap: one beam out to 16 tiles, past every lock range, cadence 1.05 s, 1 round', () => {
  const BB = RANGED_WEAPONS['secondary-blunderbuss'];
  assert.ok(CARBINE.range >= TARGET_LOCK.range && CARBINE.range >= CLOSE_VIEW.lock.range + CLOSE_VIEW.lock.slack && CARBINE.range > BB.speed * BB.lifetime * 1.3);
  const { g, s } = arena({ foes: [[3 + 15, 9.1], [3 + 15.6, 9.1]] });
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true); const beam = g.projectiles[0];
  assert.equal(beam.pierce, 0); assert.ok(Math.abs(beam.speed * beam.life - CARBINE.range) < 1e-9 && beam.life <= .25);
  assert.equal(g.player.attackReadyAt, 1000 + CARBINE.cadence * 1000); assert.equal(g.fireSecondary(1000 + CARBINE.cadence * 1000 - 1, { x: 1, y: 0 }), false, 'refused while it recovers');
  run(g, 8, 1000); const [near, behind] = lost(g); assert.ok(near > 0 && behind === 0, 'strikes the first foe 15 tiles off and stops');
  assert.equal(s.rounds.loaded, 39);
  const { g: h } = arena({ foes: [[3 + 14, 12.1]] }); let down = true; const inp = input(() => down);
  h.fireSecondary(5000, { x: 1, y: 0 }, 'tool'); down = false; run(h, 1, 5000, inp); const tap = h.projectiles[0];
  assert.ok(tap && tap.carbine && tap.charge === 0 && tap.dy > 0, 'a held tap fires on release, auto aimed at the far foe');
});

test('charge: 1.3× to 2.4× a tap between grace .2 s and full 1.25 s, then the cap; pierce up to 2; rounds 2 or 3', () => {
  const C = CARBINE.charge; assert.deepEqual([C.grace, C.full, C.min, C.max, C.pierce, C.rounds], [.2, 1.25, 1.3, 2.4, 2, 3]);
  assert.equal(carbineShare(0), 1); assert.equal(carbineShare(C.grace - .01), 1); assert.equal(carbineShare(C.grace), C.min); assert.equal(carbineShare(C.full), C.max); assert.equal(carbineShare(9), C.max);
  let prev = 0; for (let h = 0; h <= 3; h += .05) { const v = carbineShare(h); assert.ok(v >= prev - 1e-12 && Number.isFinite(v)); prev = v; }
  assert.equal(carbinePierce(0), 0); assert.equal(carbinePierce(C.full), C.pierce); assert.equal(carbineFill(99), 1);
  assert.deepEqual([0, C.grace + .01, (C.grace + C.full) / 2, C.full - .01, C.full, 9].map(carbineRounds), [1, 2, 2, 3, 3, 3]);
  const { g } = arena({ foes: [[10, 9.1], [12, 9.1], [14, 9.1], [16, 9.1]] }); const { beam } = charge(g, 1000, C.full + 2);
  const { g: p } = arena(); p.fireSecondary(1000, { x: 1, y: 0 }); const one = p.projectiles[0].damage;
  assert.equal(beam.charge, 1); assert.equal(beam.pierce, C.pierce); assert.ok(Math.abs(beam.damage - one * C.max) <= C.max, `${beam.damage} vs ${one} × ${C.max}`);
  run(g, 8, 4000); assert.deepEqual(lost(g).map((n) => n > 0), [true, true, true, false], 'through two foes into a third');
  // Rounds: full 3, part 2, tap 1; short of rounds a charge fires as full as they paid for.
  const { g: r, s } = arena(); s.rounds.loaded = 10; s.materials.cinderIron = 0;
  let t = charge(r, 1000, C.full + .1).t; assert.equal(s.rounds.loaded, 7);
  r.player.attackReadyAt = 0; t = charge(r, t + 100, .5).t; assert.equal(s.rounds.loaded, 5);
  r.player.attackReadyAt = 0; r.fireSecondary(t + 100, { x: 1, y: 0 }); assert.equal(s.rounds.loaded, 4);
  s.rounds.loaded = 2; r.player.attackReadyAt = 0; r.projectiles = []; const short = charge(r, t + 3000, C.full + .1);
  assert.equal(s.rounds.loaded, 0); assert.ok(short.beam.charge > 0 && short.beam.charge <= .5 + 1e-9); assert.match(r.message, /ran short/);
  assert.equal(carbineAffordedHold(C.full, 1), 0); r.player.attackReadyAt = 0; assert.equal(r.fireSecondary(t + 9000, { x: 1, y: 0 }, 'tool'), false);
  assert.ok(roundsLabel(s, rangedWeapon(coil())), 'the HUD shows the rounds');
});

test('Stamina scaling: Finesse raises the beam (the stamina bonus), Focus and Might do not; the same power as the Lumen Carbine', () => {
  assert.equal(CARBINE.scale, 'stamina'); assert.deepEqual(TOOL_SCALES.stamina, { bonus: 'staminaBonus', armor: 'attackDamage', damageType: 'physical' });
  assert.equal(STAMINA_BONUS.stat, 'Finesse');
  const tap = (o) => { const { g } = arena(o); g.fireSecondary(1000, { x: 1, y: 0 }); return g.projectiles[0].damage; };
  const low = tap({ finesse: 10 }), high = tap({ finesse: 60 }), focus = tap({ finesse: 10, focus: 60 }), might = tap({ finesse: 10, might: 60 });
  assert.ok(high > low * 1.5, `Finesse 10 → 60: ${low} → ${high}`); assert.equal(focus, low); assert.equal(might, low);
  // staminaBonus reads Finesse exactly as magicBonus reads Focus.
  const a = freshSave(); a.stats.Finesse = 40; a.equipment.secondary = coil(); const b = freshSave(); b.stats.Focus = 40; b.equipment.secondary = coil();
  assert.equal(characterStats(a).staminaBonus, characterStats(b).magicBonus); assert.ok(characterStats(b).staminaBonus < characterStats(b).magicBonus);
  // Base: 2.7 × the Spindle's 11 (29.7 → 30), the stat bonus counted 2.7 times: the Lumen Carbine's tap, re-derived.
  assert.equal(CARBINE.base, Math.round(RANGED_WEAPONS['secondary-lumen-spindle'].damage * 2.7)); assert.equal(CARBINE.bonus, 2.7);
  const d = characterStats(a), lumen = Math.round((11 + d.staminaBonus) * 2.7), now = carbineBase(d, {}); assert.ok(Math.abs(now - lumen) <= 1, `${now} vs Lumen Carbine ${lumen}`);
  assert.ok(Math.abs(carbineBase(d, { attackDamage: .2 }) - now * 1.2) < 1e-9, "armor's blow damage");
});

test('the Lumen Spindle is plain again: a boomerang shot every .36 s, no beam', () => {
  const { g } = arena({ item: spindle() }); assert.equal(g.carbineOn(), false);
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'), true); const shot = g.projectiles[0];
  assert.equal(shot.path, 'boomerang'); assert.equal(shot.damageType, 'magic'); assert.equal(shot.carbine, undefined); assert.equal(g.carbine, undefined); assert.equal(g.player.attackReadyAt, 1360);
  assert.ok(!TOOL_FORMS['lumen-carbine'] && !TOOL_FORM_KEYS.includes('field:lumen-carbine'));
});

test('an old save holding field:lumen-carbine migrates cleanly: the passive is dropped, its slot freed, nothing else touched', () => {
  assert.ok(RETIRED_PASSIVES.includes('field:lumen-carbine'));
  const { s } = arena({ item: spindle() }); s.lattice.passives = ['field:lumen-carbine', 'field:lumen-sunburst']; s.lattice.futureField = 7;
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.lattice.passives, ['field:lumen-sunburst']); assert.equal(m.lattice.futureField, 7); assert.equal(m.equipment.secondary.name, 'Lumen Spindle');
  // Both base slots were set; one is free again.
  const full = JSON.parse(JSON.stringify(s)); full.lattice.passives = ['field:lumen-carbine', 'field:arc-wave']; const back = migrateSave(full);
  assert.deepEqual(back.lattice.passives, ['field:arc-wave']); assert.equal(toggleLatticePassive(back, 'field:cluster-shell').ok, true);
  const g = new Game(back, 0); assert.equal(g.carbineOn(), false); assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true); assert.equal(g.projectiles[0].path, 'boomerang');
  // A Game built on an unmigrated save (ensureLattice runs in freshSave/migrateSave) still ignores it.
  assert.equal(toggleLatticePassive(back, 'field:lumen-carbine').ok, false, 'it can no longer be set');
});

test('saves: the Carbine round-trips at schema 14; the charge, traces and lasers are never saved', () => {
  const { s, g } = arena(); g.fireSecondary(1000, { x: 1, y: 0 }, 'tool'); assert.ok(g.carbine.charge);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14);
  assert.equal(back.equipment.secondary.name, 'Carbine'); assert.equal(back.equipment.secondary.id, 'spark-coil'); assert.equal(back.carbine, undefined); assert.ok(!JSON.stringify(back).includes('"charge":{"held"'));
  const again = new Game(back, 0); assert.ok(again.carbineOn()); assert.equal(again.carbine, undefined, 'a resumed journey starts with no charge');
});

test('Close View: a compact carbine with a long barrel and a cyan coil, inside the hero budget, its muzzle at the barrel tip; the coil keeps its model below the rank', () => {
  const socket = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const out = new Float32Array(256 * 3 * MODEL_FLOATS), n = writeCloseViewHeroGear(out, 0, { profile: 'carbine', rightSocket: socket, leftSocket: socket }), tris = n / MODEL_FLOATS / 3;
  assert.ok(tris > 40 && tris + CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES <= HERO_EQUIPMENT_MAX_TRIANGLES, `${tris} triangles`); assert.ok(out.slice(0, n).every(Number.isFinite));
  const frame = { powerSuit: true, suitVertexCount: CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES * 3, suitPositionsNormals: new Float32Array(CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES * 3 * 6) }, all = new Float32Array((tris + CLOSE_VIEW_POWER_SUIT_ARMOR_TRIANGLES) * 3 * MODEL_FLOATS);
  assert.equal(writeCloseViewHeroEquipment(all, 0, { profile: 'carbine', rightSocket: socket, leftSocket: socket }, frame), all.length, 'fits beside the power suit');
  assert.ok(CLOSE_VIEW_ACTOR_LOOK.emissive.includes(CARBINE_COLOURS.coil) && CARBINE_COLOURS.coil === 0x7fe7ff && CARBINE.colors.glow === 0x7fe7ff, 'the coil is an existing lit colour');
  const lit = []; for (let i = 0; i < n; i += MODEL_FLOATS) if (Math.abs(out[i + 6] - 0x7f / 255) < 1e-3 && Math.abs(out[i + 7] - 0xe7 / 255) < 1e-3 && Math.abs(out[i + 8] - 1) < 1e-3) lit.push(i); assert.ok(lit.length >= 18, 'the coil and muzzle face are lit');
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.carbine, m = closeViewHeldMuzzleLocal('carbine'); assert.deepEqual([...m], [F.axisX, -.25, F.muzzle[1]]);
  assert.ok(F.barrel[1] - F.barrel[0] > F.receiver[1] - F.receiver[0] * 1, 'a long barrel'); assert.ok(F.muzzle[1] - F.stock[0] < 1.2, 'compact');
  // The muzzle point lies at the far end of the drawn model along the barrel (socket +X), beyond every vertex.
  const p = closeViewHeldMuzzlePoint(new Float32Array(3), 'carbine', socket); let far = -Infinity; for (let i = 0; i < n; i += MODEL_FLOATS) far = Math.max(far, out[i]); assert.ok(Math.abs(p[0] - far) < .01, `muzzle ${p[0]} vs tip ${far}`);
  assert.deepEqual(closeViewHeldGear('carbine'), { hand: 'right', scale: .8, grip: 'one' });
  assert.equal(simpleToolAppearanceKind(rangedWeapon(coil())), 'carbine'); assert.equal(simpleToolAppearanceKind(rangedWeapon(coil(2))), 'spark-coil');
  assert.equal(importedEmitterAppearance({ profile: 'emitter', toolAppearance: { v: 1, kind: 'carbine' } }, null, true), 'carbine');
  assert.equal(importedEmitterAppearance(null, rangedWeapon(coil(2)), false), 'spark-coil', 'below the rank: the coil model');
});

test('standard view: the Carbine sprite once it is a Carbine; beams, afterglow and the charge draw cyan and finite', () => {
  const main = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); // main.ts runs the page; read its icon rules
  assert.match(main, /name\.includes\("Carbine"\)\?"carbine"/); assert.match(main, /q\.family==="carbine"\)\{/); assert.match(main, /name\.match\(\/Carbine\/i\)\?"#7fe7ff"/);
  const { g } = arena({ foes: [[12, 9.1]] }); const calls = { stroke: 0, fill: 0, arc: 0 };
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { if (k in calls) calls[k]++; for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} got ${v}`); }, set: (o, k, v) => { o[k] = v; return true; } });
  const toScreen = (q) => [q.x * 40, q.y * 40];
  g.fireSecondary(1000, { x: 1, y: 0 }); drawCarbine(ctx, g, toScreen, 40, 1); assert.ok(calls.stroke >= 2);
  assert.ok(standardProjectile(g.projectiles[0]) && standardProjectileColor(g.projectiles[0]) === CARBINE.colors.beam);
  run(g, 6, 1000); assert.ok(g.carbine.traces.some((q) => q.life > 0)); run(g, 10, 1300); assert.ok(g.carbine.traces.every((q) => q.life === 0));
  g.player.attackReadyAt = 0; g.fireSecondary(4000, { x: 1, y: 0 }, 'tool'); run(g, 10, 4000, input(() => true)); calls.arc = 0;
  g.presentation = { reduceMotion: true }; drawCarbine(ctx, g, toScreen, 40, 1); assert.ok(calls.arc >= 3, 'the charge glow and its ring');
});

test('60 s of beams and charges every frame (cooldowns wiped): finite, bounded, never more than the caps', () => {
  const { g, s } = arena({ foes: [[10, 9.1], [14, 10.1], [18, 8.1], [22, 9.1]], item: coil(CARBINE_RANK, { awakened: { resonance: 'afterimage', version: 1 } }) });
  s.rounds.loaded = 1e5; let t = 1000, down = false, maxShots = 0, maxTraces = 0; const inp = input(() => down);
  for (let i = 0; i < 1200; i++) {
    g.player.attackReadyAt = 0; if (i % 7 === 0) down = !down;
    g.fireSecondary(t, { x: Math.cos(i * .29), y: Math.sin(i * .29) }, i % 3 ? 'tool' : null);
    t += 50; g.update(.05, inp, t); g.player.x = 3; g.player.y = 9.55;
    maxShots = Math.max(maxShots, g.projectiles.length); maxTraces = Math.max(maxTraces, g.carbine.traces.filter((q) => q.life > 0).length);
    for (const p of g.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.damage) && p.damage > 0);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
    const c = g.carbine.charge; if (c) assert.ok(c.held >= 0 && c.held <= CARBINE.charge.full + CARBINE.charge.grace + 1e-9 && Number.isFinite(c.dir.x));
  }
  assert.equal(g.carbine.traces.length, CARBINE.trace.max); assert.ok(maxTraces <= CARBINE.trace.max);
  assert.ok(maxShots <= 32 + 4, `shots ${maxShots}`); assert.ok(lost(g).some((n) => n > 0));
  g.player.attackReadyAt = 0; down = true; g.fireSecondary(t, { x: 1, y: 0 }, 'tool'); s.equipment.secondary = null; run(g, 2, t, inp); assert.equal(g.carbine.charge, null, 'put away mid-charge: dropped');
});
