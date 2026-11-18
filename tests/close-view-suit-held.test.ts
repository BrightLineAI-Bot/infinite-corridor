// Tim's log (Unreleased): in the power armor, Close View drew the salvage blade. The resting carry tested `!form.empowered` (the
// power suit's flag) beside the Iron Fists, so a suited fist-wearer fell to the primary's model, and closeViewPrimaryWeaponKind
// turned every primary it did not list (the Iron Fists) into the salvage blade. Every primary now maps to its own model, an unknown
// one to the generic 'melee' carry, and the suit shows its own armored fists as the standard view's drawPowerSuit does.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { closeViewPrimaryWeaponKind, closeViewRestingHeld, CLOSE_VIEW_PRIMARY_MODEL } from '../src/close-view.ts';
import { playerFormPresentation, CLOSE_VIEW_HELD_GEAR } from '../src/close-view-player-presentation.ts';
import { PRIMARY_PROFILES, FOURFOLD_DAGGERS } from '../src/items.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const item = (id, name) => ({ id, name, slot: 'primary', power: 6, property: 'steady', tier: 'common', affixes: [] });
const suit = (fists, empowered = true) => playerFormPresentation({ save: { mech: { active: true, mode: 'robot', empowered }, magicSkills: {} }, mechUp: () => true, fistsEquipped: () => fists });

test('every primary the game knows has its own Close View model; none silently becomes the salvage blade', () => {
  const cases = [[item('salvage-blade', 'Salvage Blade'), 'salvage-blade'], [item('primary-iron-fists', 'Iron Fists'), 'fist'], [item('milestone-cinder-pike', 'Cinder Pike'), 'cinder-pike'],
    [item('primary-verge-cleaver', 'Verge Cleaver'), 'verge-cleaver'], [item('milestone-quandrix-staff', 'Quandrix Staff'), 'quandrix-staff'], [item('milestone-fourfold-daggers', FOURFOLD_DAGGERS.name), FOURFOLD_DAGGERS.closeView.model]];
  for (const [it, want] of cases) assert.equal(closeViewPrimaryWeaponKind(it), want, it.name);
  assert.equal(closeViewPrimaryWeaponKind(item('mystery', 'Unheard-of Glaive')), 'melee', 'an unknown primary is the generic carry');
  assert.equal(closeViewPrimaryWeaponKind(null), 'melee');
  assert.equal(Object.keys(CLOSE_VIEW_PRIMARY_MODEL).length, Object.keys(PRIMARY_PROFILES).length, 'one model per primary profile');
  for (const m of Object.values(CLOSE_VIEW_PRIMARY_MODEL)) assert.ok(m === 'fist' || Object.hasOwn(CLOSE_VIEW_HELD_GEAR, m), m);
});

test('in the power suit the resting carry is the equipped weapon: the suit\'s own fists for the Iron Fists, the weapon otherwise', () => {
  const f = suit(true); assert.equal(f.kind, 'playerPowerSuit'); assert.equal(f.empowered, true);
  assert.equal(closeViewRestingHeld(f, false, null, closeViewPrimaryWeaponKind(item('primary-iron-fists', 'Iron Fists'))), 'fist', 'never the salvage blade');
  const c = suit(false); assert.equal(closeViewRestingHeld(c, false, null, closeViewPrimaryWeaponKind(item('primary-verge-cleaver', 'Verge Cleaver'))), 'verge-cleaver');
  assert.equal(closeViewRestingHeld(suit(true, false), false, null, 'salvage-blade'), 'fist', 'the plain robot as before');
  assert.equal(closeViewRestingHeld(f, true, null, 'fist'), 'emitter', 'the tool slot as before');
  assert.equal(closeViewRestingHeld(null, false, null, 'cinder-pike'), 'cinder-pike');
  const src = fs.readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.ok(src.includes("form?.empowered && held === 'fist' ? ''"), 'the suit draws no gauntlet over its own fists');
  assert.ok(!src.includes('form?.fists && !form.empowered'), 'the suit flag no longer gates the fists');
});

test('an accepted tool use stamps the primary carried at acceptance (toolMotion.carry), kept through a paused reload', () => {
  const { game: g } = createLabFixture({ lab: 'combat-assets', scenario: 'blade-spark-ashling', now: 100000 }); g.enemies = [];
  g.save.equipment.primary = item('primary-iron-fists', 'Iron Fists');
  g.save.equipment.secondary = { id: 'secondary-rift-bombard', name: 'Rift Bombard', slot: 'secondary', power: 5, property: 'blast' };
  assert.equal(g.fireSecondary(100000, { x: 1, y: 0 }), true); assert.equal(g.player.attackVisual.toolMotion.carry, 'fist', 'the fists, never the salvage blade');
  g.setPaused(true, 100010); const back = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(100010)))), 200000);
  assert.equal(back.player.attackVisual?.toolMotion?.carry, 'fist');
});
