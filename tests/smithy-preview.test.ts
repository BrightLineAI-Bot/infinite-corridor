// 2026-11-18 (Tim): Pack → Equipped shows each piece's effective stats, and the smith and the Sphere Forge show what an action
// does before it is confirmed: before → after for deterministic work (upgrade, masterwork, socket), coloured like the Pack's
// compare. Then (Tim, same day): no confirm step; the reforge button shows the exact next seeded roll and its colour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { gearReadout, compareReadouts, forgePreview, forgeOutcome, characterStats, PRIMARY_PRESS, TOOL_PRESS } from '../src/game.ts';
import { reforgePreview, reforgeRoll, reforgeAffix, addSocket, masterwork } from '../src/smithy.ts';
import { generateItem } from '../src/items.ts';
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

test('the reforge preview is the exact roll the smith then makes, across many pieces and repeated reforges', () => {
  const s = freshSave(); s.seed = 'REFORGE-PIN'; s.farArray.listeners = 5; s.materials.cinderIron = 1e6; s.currency = 1e7;
  let checked = 0;
  for (let n = 0; n < 60; n++) {
    const item = generateItem(`reforge:${n}`, 20); if (!item.affixes.length) continue; s.equipment[item.slot] = item;
    for (let k = 0; k < 4; k++) { const i = k % item.affixes.length, pv = reforgePreview(s, item.slot, i), predicted = gearReadout(s, item.slot, forgeOutcome(s, item.slot, 'reforge', i));
      const r = reforgeAffix(s, item.slot, i); assert.equal(r.ok, true, r.message);
      assert.deepEqual(r.after, pv.after, `${item.name} affix ${i} reforge ${k}`); assert.deepEqual(r.before, pv.before);
      assert.deepEqual(gearReadout(s, item.slot), predicted, 'the shown stats are the stats after'); checked++; }
  }
  assert.ok(checked >= 100, `${checked} reforges checked`);
});

test('looking is pure: previews never change the save, the roll, or the next roll', () => {
  const s = freshSave(); s.equipment.primary = cleaver(); s.farArray.listeners = 5; s.materials.cinderIron = 9999; s.materials.lumenDust = 99; s.currency = 99999;
  characterStats(s); // characterStats settles preset defaults on first read (its own long-standing normalisation), so the snapshot starts settled
  const before = JSON.stringify(s), first = reforgePreview(s, 'primary', 0);
  for (let i = 0; i < 25; i++) { reforgePreview(s, 'primary', 0); reforgePreview(s, 'primary', 1); forgePreview(s, 'primary', 'reforge', 0); forgePreview(s, 'primary', 'masterwork'); gearReadout(s, 'primary'); }
  assert.equal(JSON.stringify(s), before, 'nothing in the save moved');
  assert.deepEqual(reforgePreview(s, 'primary', 0), first, 'the same roll every time it is looked at');
  // A reload shows the same roll; other work on the piece does not move it; only a paid reforge does, to the next seeded one.
  const reloaded = JSON.parse(before); assert.deepEqual(reforgePreview(reloaded, 'primary', 0), first);
  assert.equal(masterwork(s, 'primary').ok, true); assert.equal(addSocket(s, 'primary').ok, true); assert.deepEqual(reforgePreview(s, 'primary', 0).after, first.after);
  const paid = reforgeAffix(s, 'primary', 0); assert.deepEqual(paid.after, first.after);
  assert.equal(s.equipment.primary.reforged, 1);
  assert.deepEqual(reforgePreview(s, 'primary', 0).after, reforgeRoll(s, s.equipment.primary, 0), 'the next preview is the next seeded roll');
  assert.equal(reforgePreview(s, 'primary', 9), null);
});

test('the reforge colour: up when the affix rises, down when it falls, same when it holds, other for a new kind', () => {
  const s = freshSave(), seen = new Set();
  for (let n = 0; n < 400 && seen.size < 4; n++) { const item = generateItem(`colour:${n}`, 20); if (!item.affixes.length) continue; s.equipment[item.slot] = item;
    const pv = reforgePreview(s, item.slot, 0), a = pv.after, b = pv.before; seen.add(pv.direction);
    assert.equal(pv.direction, a.id !== b.id ? 'other' : a.value > b.value ? 'up' : a.value < b.value ? 'down' : 'same');
    if (pv.direction === 'up' || pv.direction === 'down') { const row = forgePreview(s, item.slot, 'reforge', 0).find((q) => q.id === `affix-${a.id}`); assert.equal(row.direction, pv.direction, 'the stat chip agrees'); } }
  assert.ok(seen.has('up') && seen.has('down'), [...seen].join());
});

test('the roll table reproduces the old reforge arithmetic exactly', () => {
  const old = (r, id, tier) => { const value = id === 'attack' ? 1 + Math.floor(r() * 3) + tier : id === 'reach' ? .08 + r() * .05 * tier : id === 'movement' ? .03 + r() * .025 * tier : .02 + r() * .015 * tier; return Math.round(value * 100) / 100; };
  for (const id of [...Object.keys(AFFIX_ROLLS), 'unknown']) for (let tier = 0; tier <= 3; tier++) for (let i = 0; i < 50; i++) {
    const a = rng(`pin:${id}:${tier}:${i}`), b = rng(`pin:${id}:${tier}:${i}`); assert.equal(rollAffixValue(a, id, tier), old(b, id, tier));
    const v = rollAffixValue(rng(`range:${id}:${tier}:${i}`), id, tier), lim = affixRange(id, tier); assert.ok(v >= lim.min && v <= lim.max, `${id} ${tier} ${v}`);
  }
});

test('the Pack, the smith and the Sphere Forge use the preview views, with no confirm step', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /card\.append\(gearStatList\(gearReadout\(save, slot, item\)\)\)/, 'equipped cards list their stats');
  assert.match(main, /Reforge \$\{affixText\(a\)\} → \$\{affixText\(pv\.after\)\}/, 'the reforge button names the exact result');
  assert.match(main, /reforge-\$\{pv\.direction\}/, 'and is coloured by it');
  assert.match(main, /forgePreview\(save,slot,'socket'\)/); assert.match(main, /forgePreview\(save,slot,'masterwork'\)/);
  assert.match(main, /forgePreview\(save,slot,'upgrade'\)/, 'the Sphere Forge uses the same before → after');
  assert.doesNotMatch(main, /Confirm (reforge|socket|masterwork)|smithyPick/, 'one tap: no confirm card');
  assert.doesNotMatch(main, /q\.textContent=`↑ \$\{stat\.label\}/, 'no more always-up arrows in the Forge');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.smith-action>button\.reforge-up\{color:#91d79a/); assert.match(css, /\.smith-action>button\.reforge-down\{color:#e58c87/);
});
