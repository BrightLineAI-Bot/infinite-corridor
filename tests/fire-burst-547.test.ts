// Release 547 (Tim, 2026-10-28): "a spell... fire burst... launches out a series of fireballs that fly a short distance and
// explode... look exactly like those [cracked ember shells]".
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, spellOpen } from '../src/items.ts';
import { CASTABLES, setSlot } from '../src/spell-slots.ts';
import { FIRE_BURST } from '../src/tool-forms.ts';

function arena() {
  const s = freshSave(); s.seed = 'FIRE'; s.perception.aperture = 3255; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 13, 10), { id: 'foe', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 })];
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

test('Fire Burst is a fire spell anyone can slot', () => {
  const s = freshSave(); assert.ok(SPELLS['fire-burst']); assert.equal(CASTABLES['spell:fire-burst'].attr, 'fire'); assert.ok(spellOpen(s, 'fire-burst'));
  assert.equal(setSlot(s, 'a', 'spell:fire-burst').ok, true);
});

test('a cast throws a fan of five cinder shells that burst in flame and hurt the foe; then it recovers', () => {
  const { s, g } = arena(); assert.equal(g.castSpell('fire-burst'), true);
  const shells = g.projectiles.filter((p) => p.fireBomb); assert.equal(shells.length, FIRE_BURST.count);
  assert.ok(new Set(shells.map((p) => p.dy.toFixed(2))).size === FIRE_BURST.count, 'a fan'); assert.ok(shells.every((p) => p.path === 'grenade' && p.glyphSpell === 'fire-burst'));
  let u = 1000, flames = 0; for (let i = 0; i < 20; i++) { u += 50; g.update(.05, idle, u); flames += g.effects.filter((e) => e.fireBurst).length; }
  assert.ok(flames > 0, 'they burst'); assert.ok(g.enemies[0].hp < 50000, 'and burn');
  assert.ok((s.magicSkills.cooldowns['spell:fire-burst'] || 0) > 0 || g.castSpell('fire-burst') === false);
});
