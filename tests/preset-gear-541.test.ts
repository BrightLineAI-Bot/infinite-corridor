// Release 541 (Tim, 2026-10-28): "when you set an item or a tool... in your preset, it does not become deselected or
// unequipped... It's like your character just has a second item slot... a second weapon slot or a second tool slot... you
// don't have the ability to sell or lose or salvage the other items that are in your other preset".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { equipInventoryItem } from '../src/game.ts';
import { swapPreset, ensurePresetGear } from '../src/build-presets.ts';

const piece = (slot, name) => ({ id: `${slot}-${name}`, name, slot, power: 5, property: 'steady', tier: 'rare', affixes: [] });
const journey = () => { const s = migrateSave(freshSave()); s.perception.aperture = 3255; s.equipment.primary = piece('primary', 'Verge Cleaver'); s.equipment.secondary = piece('secondary', 'Lumen Spindle'); s.equipment.armor = piece('armor', 'Kiln Mantle'); s.inventory = [piece('secondary', 'Rift Bombard'), piece('armor', 'Glassweave Coat')]; return s; };

test('fresh and old saves gain two empty preset gear sets', () => {
  assert.deepEqual(freshSave().presetGear, [{ primary: null, secondary: null }, { primary: null, secondary: null }]); // release 553: no armor
  const old = freshSave(); delete old.presetGear; assert.equal(migrateSave(JSON.parse(JSON.stringify(old))).presetGear.length, 2);
  const odd = { presetGear: [{ primary: 'junk', secondary: { slot: 'armor', name: 'x' } }] }; ensurePresetGear(odd); assert.equal(odd.presetGear[0].primary, null); assert.equal(odd.presetGear[0].secondary, null);
});

// Release 553 (Tim: "armor shouldn't swap with the preset and should just be tools"): was "tool and armor per preset".
test('the tool is per preset; armor stays with you and is not kept for the other preset', () => {
  const s = journey(); swapPreset(s); // preset 2
  equipInventoryItem(s, s.inventory.findIndex((q) => q.name === 'Rift Bombard')); equipInventoryItem(s, s.inventory.findIndex((q) => q.name === 'Glassweave Coat'));
  assert.deepEqual(s.inventory.map((q) => q.name), ['Kiln Mantle'], 'the Spindle is kept for preset 1; the Mantle goes to the pack as usual');
  swapPreset(s); assert.equal(s.equipment.secondary.name, 'Lumen Spindle'); assert.equal(s.equipment.armor.name, 'Glassweave Coat', 'armor stays'); assert.equal(s.equipment.primary.name, 'Verge Cleaver');
  swapPreset(s); assert.equal(s.equipment.secondary.name, 'Rift Bombard'); assert.equal(s.equipment.armor.name, 'Glassweave Coat');
});

test('armor a preset was holding (release 541) comes back to the pack, never lost', () => {
  const s = freshSave(); s.inventory = []; s.presetGear = [{ primary: null, secondary: null, armor: piece('armor', 'Kiln Mantle') }, { primary: piece('primary', 'Verge Cleaver'), secondary: null, armor: null }];
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.ok(back.inventory.some((q) => q.name === 'Kiln Mantle')); assert.equal(back.presetGear[1].primary.name, 'Verge Cleaver'); assert.equal('armor' in back.presetGear[0], false);
  ensurePresetGear(back); assert.equal(back.inventory.filter((q) => q.name === 'Kiln Mantle').length, 1, 'only once');
});

test('a preset that already holds its own piece: swapping in another sends the replaced one to the pack as usual', () => {
  const s = journey(); swapPreset(s); equipInventoryItem(s, s.inventory.findIndex((q) => q.name === 'Rift Bombard')); // preset 1 keeps the Spindle
  s.inventory.push(piece('secondary', 'Needle Caster')); equipInventoryItem(s, s.inventory.findIndex((q) => q.name === 'Needle Caster'));
  assert.ok(s.inventory.some((q) => q.name === 'Rift Bombard'), 'preset 2 already had its own tool'); assert.equal(s.presetGear[0].secondary.name, 'Lumen Spindle');
});

test('before presets are ever switched, equipping works exactly as before', () => {
  const s = journey(); equipInventoryItem(s, 0); assert.ok(s.inventory.some((q) => q.name === 'Lumen Spindle')); assert.equal(s.presetGear[1].secondary, null);
});

// Release 541 (Tim: "I don't see a forge master in this town... a pretty small island... each listener town should have...
// the smithy... put the smithy inside one of those buildings").
test('a Listener town on a cramped island still gets its smith, inside one of the town\'s buildings', async () => {
  const { Game } = await import('../src/game.ts'); const { applyHamlet } = await import('../src/settlements.ts');
  const s = freshSave(); s.seed = 'ISLE'; s.hometowns = { towns: [{ rx: 7, ry: 9, name: 'Thornreach', listener: 1, mouth: false }], home: null };
  const g = new Game(s, 0); g.area = 'overworld'; g.rx = 7; g.ry = 9;
  const map = { width: 32, height: 32, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'grass', blocked: false })) };
  applyHamlet(map, s.seed, 7, 9, undefined, true);
  for (const t of map.tiles) if (!t.buildingId && map.objects.every((o) => Math.hypot(o.x - t.x, o.y - t.y) > 1.5)) { t.blocked = true; t.kind = 'ocean'; } // the island: only the huts and the square's people
  g.map = map; g.raiseTownAmenities();
  const smith = g.map.objects.find((o) => o.kind === 'townSmith'); assert.ok(smith, 'a smith');
  const tile = g.map.tiles[smith.y * 32 + smith.x]; assert.match(String(tile.buildingId), /^hamlet-7-9-/); assert.match(tile.structure, /Interior$/);
  g.raiseTownAmenities(); assert.equal(g.map.objects.filter((o) => o.kind === 'townSmith').length, 1, 'only one');
});
