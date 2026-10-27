// Release 485 (Tim, 2026-10-27): Aegis (a one-second shield) and Shadow Boxing (swings that stick to your foe, with heal,
// guard and damage while it lasts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS } from '../src/items.ts';
import { CASTABLES } from '../src/spell-slots.ts';
import { BRAWLER } from '../src/brawler-spells.ts';

function arena(foes, dmg = 0) {
  const s = freshSave(); s.seed = 'BOX'; s.perception.aperture = 3255; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.maxHp = 100; s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: dmg, cooldown: 99 }));
  return { s, g };
}
const step = (g, t) => { g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t); };
// A blow that lands inside the frame: a hostile effect on the Wayfarer.
const blow = (g, t, damage = 30) => { g.player.invulnerableUntil = 0; const before = g.player.hp; g.effects.push({ id: `hit-${t}`, hostile: true, x: g.player.x + .5, y: g.player.y + .52, radius: 1, damage, life: .3, pulse: 99, untilPulse: 0, hits: {} }); step(g, t); g.effects = []; return before - g.player.hp; };

test('Aegis and Shadow Boxing are spells from Infinite III', () => {
  for (const id of ['aegis', 'shadow-boxing']) { assert.ok(SPELLS[id]?.brawler, id); assert.ok(CASTABLES[`spell:${id}`], id); assert.ok(BRAWLER[id], id); }
});

test('Aegis turns every blow aside for a second, then no longer', () => {
  const { g } = arena([]); step(g, 1000); g.castSpell('aegis');
  assert.equal(blow(g, 1100), 0, 'blocked');
  assert.ok(blow(g, 1000 + BRAWLER.aegis.ms + 200) > 0, 'after it ends, blows land');
});

test('Shadow Boxing: a swing carries you to a foe out of reach, hits harder and heals; blows taken are reduced', () => {
  const { s, g } = arena([['foe', 13, 10]]); step(g, 1000); g.castSpell('shadow-boxing'); g.player.hp = 50;
  const x0 = g.player.x; g.primaryAttack(1100);
  assert.ok(g.player.x > x0 + 1, `carried toward the foe (${x0} -> ${g.player.x.toFixed(2)})`);
  assert.ok(g.enemies[0].hp < 5000, 'and the swing lands'); assert.ok(g.player.hp > 50, 'and heals');
  const plainBlow = arena([]); step(plainBlow.g, 1000); const full = blow(plainBlow.g, 1200), boxed = blow(g, 1200);
  assert.ok(full > 0 && Math.abs(boxed - full * (1 - BRAWLER['shadow-boxing'].guard)) < 1.01, `guard takes 15% off (${full} -> ${boxed})`);
  const plain = arena([['foe', 13, 10]]); step(plain.g, 1000); const px = plain.g.player.x; plain.g.primaryAttack(1100);
  assert.equal(plain.g.player.x, px, 'without it, a swing does not move you');
});

test('Shadow Boxing never carries you through a wall', () => {
  const { g } = arena([['foe', 14, 10]]); for (const t of g.map.tiles) if (t.x === 12) t.blocked = true;
  step(g, 1000); g.castSpell('shadow-boxing'); g.primaryAttack(1100); assert.ok(g.player.x < 11.3, `${g.player.x}`);
});
