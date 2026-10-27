// Release 493 (Tim, 2026-10-27): "the iron fist is an attack. The hammer fall and the great sweep are tools. And the [aegis]
// and shadow boxing are spells... shadow boxing should work with iron fist... the presets should be able to preset... your
// weapon and your tool".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, rangedWeapon } from '../src/items.ts';
import { CASTABLES, ensureSlots } from '../src/spell-slots.ts';
import { BRAWLER } from '../src/brawler-spells.ts';
import { swapPreset } from '../src/build-presets.ts';

const gear = (name) => ({ ...BRAWLER_GEAR.find((g) => g.item.name === name).item });
function arena(foes, setup = () => {}) {
  const s = freshSave(); s.seed = 'TOOLS'; s.perception.aperture = 3255; setup(s); const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const press = (k) => { let used = false; return { state: { x: 0, y: 0 }, consume: (q) => q === k && !used && (used = true), held: () => false }; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

test('Hammerfall and Great Sweep are tools now, not spells; Aegis and Shadow Boxing stay spells', () => {
  for (const id of ['hammerfall', 'great-sweep']) { assert.equal(SPELLS[id], undefined); assert.equal(CASTABLES[`spell:${id}`], undefined); }
  for (const id of ['aegis', 'shadow-boxing']) assert.ok(CASTABLES[`spell:${id}`]);
  assert.equal(rangedWeapon(gear('Hammerfall')).brawlerTool, 'hammerfall'); assert.equal(rangedWeapon(gear('Great Sweep')).brawlerTool, 'great-sweep');
  const s = migrateSave(freshSave()); s.spellGlyphs = { hammerfall: ['chain', null] }; s.glyphs.chain = 0; ensureSlots(s); assert.equal(s.glyphs.chain, 1, 'glyphs come back');
});

test('Tool with Hammerfall drops a hammer on the foe; with Great Sweep it sweeps round you; each has its own short recovery', () => {
  const h = arena([['foe', 12, 10]], (s) => { s.equipment.secondary = gear('Hammerfall'); }); let t = 1000; h.g.update(.05, idle, t);
  t += 50; h.g.update(.05, press('tool'), t); for (let i = 0; i < 10; i++) { t += 50; h.g.update(.05, idle, t); }
  assert.ok(h.g.enemies[0].hp < 50000, 'the hammer landed');
  assert.equal(h.g.brawlerTool('hammerfall', t + 50), false, `recovering (${BRAWLER.hammerfall.cooldown} s)`);
  const w = arena([['e', 12, 10], ['w', 8, 10]], (s) => { s.equipment.secondary = gear('Great Sweep'); }); let u = 1000; w.g.update(.05, idle, u);
  u += 50; w.g.update(.05, press('tool'), u); u += 50; w.g.update(.05, idle, u);
  assert.ok(w.g.enemies.every((e) => e.hp < 50000), 'both sides');
});

test('Shadow Boxing works with the Iron Fists: a longer rush, harder punches that heal', () => {
  const plain = arena([['foe', 17, 10]], (s) => { s.equipment.primary = gear('Iron Fists'); }); let t = 1000; plain.g.update(.05, idle, t);
  t += 50; plain.g.update(.05, press('attack'), t); assert.equal(plain.g.player.x, 10, 'beyond the plain rush: in place');
  const box = arena([['foe', 17, 10]], (s) => { s.equipment.primary = gear('Iron Fists'); }); let u = 1000; box.g.update(.05, idle, u);
  box.g.castSpell('shadow-boxing'); box.g.player.hp = 50;
  u += 50; box.g.update(.05, press('attack'), u); u += 50; box.g.update(.05, idle, u);
  assert.ok(box.g.player.x > 14, `boxing rushes farther (${box.g.player.x})`); assert.ok(box.g.enemies[0].hp < 50000); assert.ok(box.g.player.hp > 50, 'and heals');
});

test('presets keep a weapon and a tool, equipping them from the pack on a switch', () => {
  const s = migrateSave(freshSave()); s.perception.aperture = 3255;
  s.equipment.primary = gear('Iron Fists'); s.equipment.secondary = gear('Hammerfall'); s.inventory = [gear('Great Sweep'), { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 5 }];
  swapPreset(s); // to preset 2: it takes this build (and gear)
  // preset 2: change gear
  const i = s.inventory.findIndex((q) => q.name === 'Verge Cleaver'); const prior = s.equipment.primary; s.equipment.primary = s.inventory.splice(i, 1)[0]; s.inventory.push(prior);
  const j = s.inventory.findIndex((q) => q.name === 'Great Sweep'); const pt = s.equipment.secondary; s.equipment.secondary = s.inventory.splice(j, 1)[0]; s.inventory.push(pt);
  const r = swapPreset(s); // back to preset 1
  assert.equal(s.equipment.primary.name, 'Iron Fists'); assert.equal(s.equipment.secondary.name, 'Hammerfall'); assert.match(r.message, /weapon and tool/);
  swapPreset(s); assert.equal(s.equipment.primary.name, 'Verge Cleaver'); assert.equal(s.equipment.secondary.name, 'Great Sweep');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(back.equipment.primary.tag, 'tags survive a save');
});

test('release 495: Shadow Boxing works with Hammerfall and Great Sweep too', () => {
  const far = (boxing) => { const { g } = arena([['foe', 16, 10]], (s) => { s.equipment.secondary = gear('Hammerfall'); }); let t = 1000; g.update(.05, idle, t); if (boxing) g.castSpell('shadow-boxing');
    g.player.hp = 50; g.brawlerTool('hammerfall', t + 50); for (let i = 0; i < 10; i++) { t += 50; g.update(.05, idle, t); } return { hit: g.enemies[0].hp < 50000, hp: g.player.hp }; };
  assert.equal(far(false).hit, false, 'six tiles off: the plain hammer falls short'); const b = far(true); assert.ok(b.hit, 'boxing reaches it'); assert.ok(b.hp > 50, 'and heals');
  const { g } = arena([['foe', 14, 10]], (s) => { s.equipment.secondary = gear('Great Sweep'); }); let t = 1000; g.update(.05, idle, t); g.castSpell('shadow-boxing');
  g.brawlerTool('great-sweep', t + 50); t += 50; g.update(.05, idle, t); assert.ok(g.player.x > 11, `carried to the foe (${g.player.x})`); assert.ok(g.enemies[0].hp < 50000);
});
