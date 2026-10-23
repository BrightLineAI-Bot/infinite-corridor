// Release 347 (Tim, 2026-10-23): tap-to-target holds and is used by every attack; Oren Vale retrains stats for 500 marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { applyInteraction, validActions, STAT_RESPEC } from '../src/interactions.ts';

function arena(s) {
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50 });
  g.enemies = [[12, 10, 'near'], [10, 15, 'far']].map(([x, y, id]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 300, maxHp: 300, damage: 0, cooldown: 99 }));
  return g;
}

test('a wider tap, and tapping again keeps the lock', () => {
  const g = arena(freshSave());
  assert.equal(g.enemyAt(10.5 + .9, 15.4)?.id, 'far', 'a tap a little off-centre still picks it');
  g.lockTarget('far'); g.lockTarget('far'); assert.equal(g.lockedTarget()?.id, 'far');
});

test('tool shots and spells go to the locked target, not the nearest', () => {
  const s = freshSave(), g = arena(s); g.lockTarget('far');
  g.update(.05, { state: { x: 0, y: 0 }, consume: (k) => k === 'tool' }, 1000);
  const shot = g.projectiles.find((p) => !p.hostile); assert.ok(shot && shot.dy > .9, `aimed down at the locked foe (${shot?.dx?.toFixed(2)},${shot?.dy?.toFixed(2)})`);
  g.castSpell('ember-ring'); const fx = g.effects.find((f) => f.glyphHost === 'spell'); assert.ok(fx.y > 12, `spell landed toward it (${fx.y})`);
});

test('Oren retrains stats for 500 marks', () => {
  const s = freshSave(); s.stats.Might = 6; s.stats.Focus = 3; s.statPoints = 1; s.currency = 600;
  const oren = { id: 'warden-oren', kind: 'npc', actions: ['speak', 'attack', 'standDown'] };
  assert.ok(validActions(oren, s).includes('retrain'));
  const r = applyInteraction(oren, 'retrain', s); assert.equal(r.ok, true);
  assert.equal(s.currency, 600 - STAT_RESPEC.marks); assert.deepEqual(Object.values(s.stats), [1, 1, 1, 1, 1]); assert.equal(s.statPoints, 1 + 5 + 2);
  const poor = freshSave(); poor.stats.Might = 3; poor.currency = 10; assert.equal(applyInteraction(oren, 'retrain', poor).ok, false); assert.equal(poor.stats.Might, 3);
});
