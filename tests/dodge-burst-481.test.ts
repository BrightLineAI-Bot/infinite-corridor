// Release 481 (Tim, 2026-10-27): dodge bursts grow with spell damage; Volatile in the armor widens them; Chain in the armor
// makes the first foe hit erupt again. Two Echo glyphs on a spell echo it at 75%. Glimpses are seen once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, DODGE_BURST } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { echoPlan, hostLoadout, ARMOR_GLYPHS } from '../src/glyphs.ts';
import { GLIMPSE_MAX_SEEN } from '../src/glimpses.ts';

function arena(armorGlyphs = []) {
  const s = freshSave(); s.seed = 'BURST'; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' });
  s.equipment.armor = { id: 'a', slot: 'armor', name: 'Coat', tier: 'relic', power: 1, glyphs: armorGlyphs };
  return { s, g };
}
const foe = (id, x, y) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 });

test('dodge bursts add the magic bonus and the spell damage multipliers', () => {
  const plain = arena(), ignite = arena(['ignite', 'ignite']);
  const a = plain.g.dodgeBurst(10.5, 10.45, 1.8, 20), b = ignite.g.dodgeBurst(10.5, 10.45, 1.8, 20);
  assert.ok(a >= 20, `at least the base (${a})`); assert.ok(b > a, `Ignite in the armor (+spell damage) raises it: ${a} -> ${b}`);
});

test('Volatile in the armor widens a burst; Chain makes the first foe hit erupt again', () => {
  const edge = 1.8 * 1.2; // beyond the plain radius, within the Volatile one
  const plain = arena(); plain.g.enemies = [foe('far', 10 + edge, 10)]; plain.g.dodgeBurst(10.5, 10.45, 1.8, 20);
  assert.equal(plain.g.enemies[0].hp, 5000, 'out of reach of a plain burst');
  const wide = arena(['volatile']); wide.g.enemies = [foe('far', 10 + edge, 10)]; wide.g.dodgeBurst(10.5, 10.45, 1.8, 20);
  assert.ok(wide.g.enemies[0].hp < 5000, 'a Volatile burst reaches it');
  assert.match(ARMOR_GLYPHS.volatile.text, /wider/); assert.match(ARMOR_GLYPHS.chain.text, /again/);
  const chain = arena(['chain']); chain.g.enemies = [foe('near', 11, 10), foe('beyond', 12.6, 10)]; const dealt = chain.g.dodgeBurst(10.5, 10.45, 1.8, 20);
  assert.ok(chain.g.enemies[1].hp < 5000, 'the second burst around the first foe reaches one beyond the first burst');
  assert.equal(chain.g.enemies[1].hp, 5000 - Math.round(dealt * ARMOR_GLYPHS.chain.burstChain), 'at 60% of the burst');
  assert.ok(DODGE_BURST.chainRadius > 0);
});

test('two Echo glyphs on a spell echo it at 75%; one at 50%', () => {
  const s = freshSave(); s.spellGlyphs = { 'cinder-dart': ['echo', null] };
  assert.equal(echoPlan(hostLoadout(s, 'spell', 'cinder-dart')).share, .5);
  s.spellGlyphs['cinder-dart'] = ['echo', 'echo'];
  assert.equal(echoPlan(hostLoadout(s, 'spell', 'cinder-dart')).share, .75);
});

test('a Glimpse surfaces once in play (the book replays it)', () => { assert.equal(GLIMPSE_MAX_SEEN, 1); });
