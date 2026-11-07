import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnemyProjectilePattern, advanceEnemyProjectileBehaviors } from '../src/enemy-patterns.ts';
import { dronePos, tickAffixes } from '../src/affixes.ts';
import { projectileVisualHeight, shotVisualHeight, DEFAULT_PROJECTILE_VISUAL_HEIGHT, DRONE_VISUAL_HEIGHT } from '../src/actor-presentation.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const physics = (shot) => { const { visualHeight, visualOwnerId, ...rest } = shot; return rest; };
test('real hostile projectile producers latch shared visual sockets without changing shot physics', () => {
  const shooter = { id: 'socket-warden', kind: 'sparkWarden', x: 2, y: 3, damage: 10, scale: 2 };
  const [shot] = buildEnemyProjectilePattern(shooter, { x: 1, y: 0 }, 1000);
  assert.deepEqual(physics(shot), { x: 2.5, y: 3.42, id: 'enemy-shot-socket-warden-1000-single', dx: 1, dy: 0, speed: 4.2, life: 2.4, damage: 10, hostile: true, hits: {}, path: 'straight' });
  assert.equal(shot.visualHeight, projectileVisualHeight(shooter));
  assert.equal(shot.visualOwnerId, shooter.id);
  const frozen = shot.visualHeight; shooter.scale = 7; shooter.dead = true;
  assert.equal(shotVisualHeight(shot), frozen, 'a moving, growing or removed owner cannot move an existing shot');
  for (const kind of ['sparkWarden', 'cinderWisp', 'voidSentinel']) {
    const owner = { id: kind, kind, x: 4, y: 5, damage: 10, scale: 1.5 };
    for (let i = 0; i < 4; i++) {
      const shots = buildEnemyProjectilePattern(owner, { x: .6, y: .8 }, 2000 + i);
      assert.ok(shots.length > 0);
      for (const p of shots) { assert.equal(p.visualHeight, projectileVisualHeight(owner)); assert.equal(p.visualOwnerId, kind); assert.equal(p.x, 4.5); assert.equal(p.y, 5.42); }
    }
  }
  assert.equal(shotVisualHeight({}), DEFAULT_PROJECTILE_VISUAL_HEIGHT);
  for (const bad of [NaN, Infinity, '1.2']) assert.equal(shotVisualHeight({ visualHeight: bad }), DEFAULT_PROJECTILE_VISUAL_HEIGHT);
  assert.ok(shotVisualHeight({ visualHeight: -10 }) > 0);
  assert.ok(shotVisualHeight({ visualHeight: 1000 }) <= 8);
});

test('split shots inherit the original release socket despite resetting age', () => {
  const owner = { id: 'split-owner', kind: 'knifeChoir', x: 1, y: 2, damage: 10, shotSequence: 1 };
  const [shot] = buildEnemyProjectilePattern(owner, { x: 1, y: 0 }, 1000);
  assert.ok(shot.splitAfter > 0); shot.age = shot.splitAfter;
  const children = advanceEnemyProjectileBehaviors([shot], { x: 9, y: 9 }, .01);
  assert.equal(children.length, 3);
  for (const child of children) {
    assert.equal(child.visualHeight, shot.visualHeight); assert.equal(child.visualOwnerId, owner.id);
    assert.equal(child.age, 0); assert.equal(child.splitDone, true); assert.equal(child.damage, 4);
  }
});

test('Drone Swarm shots use the real orbiter XY/socket and survive an area save/load', () => {
  const save = freshSave(); save.seed = 'DRONE-SOCKET-REVIEW';
  const game = new Game(save, 1000);
  const e = createCombatant('sparkWarden', 15, 14, false, []);
  e.id = 'drone-source'; e.affixes = ['droneSwarm']; e.affixClock = { droneSwarm: 0 }; e.scale = 3;
  game.enemies = [e]; game.projectiles = [];
  tickAffixes(game, .01, 2000, () => assert.fail('no hazard expected'), () => assert.fail('no poison expected'));
  const shot = game.projectiles.find((p) => p.affixShot); assert.ok(shot);
  const orbiter = dronePos(e, e.droneTurn, 2);
  assert.equal(shot.x, orbiter.x); assert.equal(shot.y, orbiter.y);
  assert.equal(shot.visualHeight, DRONE_VISUAL_HEIGHT); assert.equal(shot.visualOwnerId, e.id);
  const out = game.exportSnapshot(2010);
  const resumed = new Game(migrateSave(JSON.parse(JSON.stringify(out))), 5000);
  const restored = resumed.projectiles.find((p) => p.id === shot.id); assert.ok(restored);
  assert.equal(restored.visualHeight, shot.visualHeight); assert.equal(restored.visualOwnerId, e.id);
});

