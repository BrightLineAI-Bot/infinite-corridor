// Release 483 (Tim, 2026-10-27): brawler spells that hit like weapons. Hammerfall, Great Sweep, Iron Fist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, spellOpen } from '../src/items.ts';
import { CASTABLES } from '../src/spell-slots.ts';
import { BRAWLER } from '../src/brawler-spells.ts';

function arena(foes) {
  const s = freshSave(); s.seed = 'BRAWL'; s.perception.aperture = 3255; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const run = (g, n, input = idle, t0 = 1000) => { let t = t0; for (let i = 0; i < n; i++) { g.update(.05, input, t); t += 50; } return t; };

test('three brawler spells, open from Infinite III, slotted like any spell', () => {
  for (const id of ['hammerfall', 'great-sweep']) { assert.ok(SPELLS[id]?.brawler, id); assert.ok(CASTABLES[`spell:${id}`], id); assert.ok(BRAWLER[id], id); }
  const s = freshSave(); assert.equal(spellOpen(s, 'hammerfall'), false); s.perception.aperture = 3255; assert.equal(spellOpen(s, 'hammerfall'), true);
});

test('Hammerfall falls on the target after a beat and hits for a share of a swing; it follows melee damage', () => {
  const { s, g } = arena([['foe', 12, 10]]); const power = g.meleePower();
  assert.equal(g.castSpell('hammerfall'), true); assert.equal(g.enemies[0].hp, 5000, 'not yet: the hammer is still falling');
  run(g, 12); const lost = 5000 - g.enemies[0].hp;
  assert.ok(Math.abs(lost - Math.round(power * BRAWLER.hammerfall.share)) <= 1, `${lost} vs ${power * BRAWLER.hammerfall.share}`);
  const strong = arena([['foe', 12, 10]]); strong.s.equipment.armor = { id: 'a', slot: 'armor', name: 'Coat', tier: 'relic', power: 1, glyphs: ['volatile', 'volatile'] };
  assert.ok(strong.g.meleePower() > power, 'melee damage raises it');
});

test('Great Sweep hits every foe round you, not those beyond its radius', () => {
  const { g } = arena([['e', 12, 10], ['w', 8, 10], ['n', 10, 8], ['far', 16, 10]]);
  g.castSpell('great-sweep'); run(g, 2);
  for (const id of ['e', 'w', 'n']) assert.ok(g.enemies.find((e) => e.id === id).hp < 5000, id);
  assert.equal(g.enemies.find((e) => e.id === 'far').hp, 5000);
});

// Release 489: the Iron Fist spell became the Iron Fists tool (tests/iron-fists-489.test.ts).
