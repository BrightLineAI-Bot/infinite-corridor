// Release 479 (Tim, 2026-10-27): "the spells, when I cast them right now, they just get cast in some random direction, they
// should just get cast at whatever enemy... I'm targeting... either it's auto target or... the enemy that I have... tab
// targeted". A locked target first, then a fresh tap, then auto target; a stale tap no longer sends a spell astray.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, AUTO_AIM } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';

function arena(foes) {
  const s = freshSave(); s.seed = 'AIM'; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 900, maxHp: 900, damage: 0, cooldown: 99 }));
  return { s, g };
}
const spellAt = (g) => { const f = g.effects.find((e) => e.glyphHost === 'spell' && !e.echo); return { x: f.x, y: f.y }; };
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < .01;

test('auto target: with no lock and no tap, a spell lands on the nearest foe in range', () => {
  const { g } = arena([['far', 14, 10], ['close', 10, 13]]);
  assert.equal(g.castSpell('cinder-dart'), true);
  assert.ok(near(spellAt(g), { x: 10.5, y: 13.45 }), JSON.stringify(spellAt(g)));
  assert.equal(g.aimMark?.id, 'close', 'the struck foe is marked');
});

test('a tab-locked target wins over a nearer foe', () => {
  const { g } = arena([['far', 14, 10], ['close', 10, 12]]);
  g.lockTarget('far'); g.castSpell('cinder-dart');
  assert.ok(near(spellAt(g), { x: 14.5, y: 10.45 }), JSON.stringify(spellAt(g)));
});

test('a stale tap (its reticle faded) no longer sends the spell off; a fresh tap aims it when no foe is in reach', () => {
  const { s, g } = arena([['foe', 13, 10]]);
  g.aimAt(6, 14); g.reticle.life = 0; g.castSpell('cinder-dart');
  assert.ok(near(spellAt(g), { x: 13.5, y: 10.45 }), `stale tap ignored: ${JSON.stringify(spellAt(g))}`);
  const b = arena([['foe', 13, 10]]); b.g.aimAt(8, 12); b.g.castSpell('cinder-dart');
  assert.ok(near(spellAt(b.g), { x: 13.5, y: 10.45 }), `release 481: a foe in reach comes before a fresh tap: ${JSON.stringify(spellAt(b.g))}`); assert.equal(s.pendingAim, null);
  const c = arena([['foe', 28, 28]]); c.g.aimAt(8, 12); c.g.castSpell('cinder-dart');
  assert.ok(near(spellAt(c.g), { x: 8, y: 12 }), `no foe in reach: the fresh tap is used: ${JSON.stringify(spellAt(c.g))}`);
});

test('a foe beyond the spell\'s range is still the aim: the spell lands toward it at full range', () => {
  const { g } = arena([['foe', 17, 10]]); g.castSpell('cinder-dart'); // 7 tiles away; Cinder Dart reaches 6
  const at = spellAt(g); assert.ok(Math.abs(at.y - 10.45) < .01 && Math.abs(at.x - 16.5) < .01, JSON.stringify(at));
  const none = arena([['foe', 10 + 6 * AUTO_AIM.spellScale + 3, 10]]); none.g.castSpell('cinder-dart');
  assert.ok(near(spellAt(none.g), { x: 10.5, y: 10.45 }), 'no foe in reach: it lands where you stand, as before');
});
