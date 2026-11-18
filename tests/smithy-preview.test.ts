// 2026-11-18 (Tim): Pack → Equipped shows each piece's effective stats, and the smith and the Sphere Forge show what an action
// does before it is confirmed: before → after for deterministic work (upgrade, masterwork, socket), coloured like the Pack's
// compare; for a reforge, the current stats and the range each possible affix may roll (never the roll itself).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { gearReadout, compareReadouts, forgePreview, forgeOutcome, characterStats, PRIMARY_PRESS, TOOL_PRESS } from '../src/game.ts';
import { reforgeChoices, reforgeAffix, addSocket, masterwork } from '../src/smithy.ts';
import { rollAffixValue, affixRange, AFFIX_ROLLS, upgradeEquipment, PRIMARY_PROFILES, RANGED_WEAPONS } from '../src/items.ts';
import { rng } from '../src/random.ts';
import { socketCount } from '../src/glyphs.ts';
import { PRIMARY_SWINGS } from '../src/melee-swing.ts';

const byId = (rows) => Object.fromEntries(rows.map((q) => [q.id, q]));
const cleaver = () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', property: 'impact', power: 12, basePower: 10, upgradeRank: 2, tier: 'epic', affixes: [{ id: 'attack', value: 4 }, { id: 'reach', value: .1 }] });

test('the equipped weapon shows its hit, combo, reach, arc and pace', () => {
  const s = freshSave(); s.equipment.primary = cleaver();
  const r = byId(gearReadout(s, 'primary')), d = characterStats(s), P = PRIMARY_PROFILES['primary-verge-cleaver'];
  assert.ok(r.hit.value > P.damage, 'the hit adds the weapon bonus');
  assert.equal(r.reach.value, P.range * (1 + d.attackReach)); assert.match(r.reach.text, /tiles/);
  assert.equal(r.arc.value, 180);
  assert.equal(r.combo.text, PRIMARY_SWINGS['verge-cleaver'].steps.map((q) => `×${q.share}`).join(' · '));
  assert.equal(r.pace.better, 'lower'); assert.match(r.pace.text, /s a step/);
  assert.equal(r['affix-attack'].text, '+4'); assert.equal(r['affix-reach'].text, '+10%');
  assert.equal(r.sockets.value, socketCount(s.equipment.primary));
  const blade = byId(gearReadout(freshSave(), 'primary')); assert.equal(blade.pace.value, PRIMARY_PRESS.ms / 1000);
});

test('the equipped tool shows damage, type, range and pace; armor shows its resistance and the total cut', () => {
  const s = freshSave(), t = byId(gearReadout(s, 'secondary')), W = RANGED_WEAPONS['spark-coil'];
  assert.match(t.hit.text, /magic/); assert.ok(t.hit.value >= W.damage);
  assert.equal(Math.round(t.range.value * 100) / 100, Math.round(W.speed * W.lifetime * (1 + characterStats(s).attackReach) * 100) / 100);
  assert.equal(t.pace.value, TOOL_PRESS.ms / 1000);
  s.equipment.armor = { id: 'a', name: 'Kiln Mantle', slot: 'armor', property: 'guard', power: 8, basePower: 8, upgradeRank: 0, tier: 'rare', affixes: [{ id: 'ward', value: .05 }] };
  const a = byId(gearReadout(s, 'armor'));
  assert.equal(a.guard.text, '20%'); assert.equal(a['affix-ward'].text, '+5%');
  assert.equal(a.reduction.value, characterStats(s).damageReduction * 100);
  assert.equal(gearReadout(s, 'charm').length, 0, 'an empty slot has no readout');
});

test('an upgrade preview matches what the Sphere Forge then makes, every changed stat up', () => {
  const s = freshSave(); s.equipment.primary = cleaver(); s.materials.weaponSphere = 99;
  const rows = forgePreview(s, 'primary', 'upgrade'), changed = rows.filter((q) => q.direction !== 'same');
  assert.ok(changed.length >= 2); assert.ok(changed.every((q) => q.direction === 'up'), JSON.stringify(changed));
  const power = byId(rows).power; assert.deepEqual([power.before, power.after], ['12', '13']);
  const predicted = gearReadout(s, 'primary', forgeOutcome(s, 'primary', 'upgrade'));
  assert.equal(upgradeEquipment(s, 'primary').ok, true);
  assert.deepEqual(gearReadout(s, 'primary'), predicted, 'the preview is the outcome');
});

test('masterwork and socket previews show the exact change and match the smith', () => {
  const s = freshSave(); s.equipment.primary = cleaver(); s.farArray.listeners = 5; s.materials.cinderIron = 99; s.materials.lumenDust = 99; s.currency = 9999;
  const mw = forgePreview(s, 'primary', 'masterwork').filter((q) => q.direction !== 'same');
  assert.deepEqual(mw.map((q) => [q.id, q.before, q.after, q.direction]), [['cap', '+5', '+6', 'up']]);
  const sock = forgePreview(s, 'primary', 'socket').filter((q) => q.direction !== 'same');
  assert.deepEqual(sock.map((q) => [q.id, q.value - Number(q.before), q.direction]), [['sockets', 1, 'up']]);
  const predicted = gearReadout(s, 'primary', forgeOutcome(s, 'primary', 'socket'));
  assert.equal(addSocket(s, 'primary').ok, true); assert.deepEqual(gearReadout(s, 'primary'), predicted);
  assert.equal(forgePreview(s, 'primary', 'socket'), null, 'no second socket');
  assert.equal(masterwork(s, 'primary').ok, true); assert.equal(forgePreview(s, 'primary', 'masterwork'), null, 'no second masterwork');
});

test('compare colours follow each stat: higher is green, lower red, pace improves as it falls', () => {
  const before = [{ id: 'a', label: 'A', value: 5, text: '5', better: 'higher' }, { id: 'p', label: 'Pace', value: .5, text: '.5', better: 'lower' }, { id: 'n', label: 'N', value: 1, text: '1', better: 'higher' }];
  const after = [{ ...before[0], value: 3, text: '3' }, { ...before[1], value: .4, text: '.4' }, before[2]];
  assert.deepEqual(compareReadouts(before, after).map((q) => q.direction), ['down', 'up', 'same']);
});

test('the reforge preview gives each possible affix and its range, and every real roll lands inside it', () => {
  const s = freshSave(); s.equipment.primary = cleaver(); s.farArray.listeners = 5; s.materials.cinderIron = 9999; s.currency = 99999;
  const c = reforgeChoices(s, 'primary', 0);
  assert.deepEqual(c.current, { id: 'attack', value: 4 });
  assert.deepEqual(c.choices.map((q) => q.id), ['attack'], 'the other affix (reach) is held by the piece, so the roll stays attack');
  assert.deepEqual(c.choices[0], { id: 'attack', min: 3, max: 5 });
  for (let i = 0; i < 40; i++) { const r = reforgeAffix(s, 'primary', 0); assert.equal(r.ok, true); const lim = reforgeChoices(s, 'primary', 0).choices.find((q) => q.id === r.after.id); assert.ok(r.after.value >= lim.min && r.after.value <= lim.max, JSON.stringify(r.after)); }
  assert.equal(reforgeChoices(s, 'primary', 9), null);
});

test('the roll table reproduces the old reforge arithmetic exactly', () => {
  const old = (r, id, tier) => { const value = id === 'attack' ? 1 + Math.floor(r() * 3) + tier : id === 'reach' ? .08 + r() * .05 * tier : id === 'movement' ? .03 + r() * .025 * tier : .02 + r() * .015 * tier; return Math.round(value * 100) / 100; };
  for (const id of [...Object.keys(AFFIX_ROLLS), 'unknown']) for (let tier = 0; tier <= 3; tier++) for (let i = 0; i < 50; i++) {
    const a = rng(`pin:${id}:${tier}:${i}`), b = rng(`pin:${id}:${tier}:${i}`); assert.equal(rollAffixValue(a, id, tier), old(b, id, tier));
    const v = rollAffixValue(rng(`range:${id}:${tier}:${i}`), id, tier), lim = affixRange(id, tier); assert.ok(v >= lim.min && v <= lim.max, `${id} ${tier} ${v}`);
  }
});

test('the Pack, the smith and the Sphere Forge use the preview views', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /card\.append\(gearStatList\(gearReadout\(save, slot, item\)\)\)/, 'equipped cards list their stats');
  assert.match(main, /Confirm reforge ·/); assert.match(main, /Confirm socket ·/); assert.match(main, /Confirm masterwork ·/);
  assert.match(main, /forgePreview\(save,slot,'upgrade'\)/, 'the Sphere Forge uses the same before → after');
  assert.match(main, /The new roll is random/);
  assert.doesNotMatch(main, /q\.textContent=`↑ \$\{stat\.label\}/, 'no more always-up arrows in the Forge');
});
