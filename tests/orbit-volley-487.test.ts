// Release 487 (Tim, 2026-10-27): Orbit Volley. Orbs gather round you; a second press launches them at your target, stronger
// with the charge, perfect (with a vortex) in the gold window; left alone they go as a plain ball.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS } from '../src/items.ts';
import { CASTABLES } from '../src/spell-slots.ts';
import { ORBIT, orbitLaunch, orbitCount, orbitPerfect } from '../src/orbit-volley.ts';

function arena(foes) {
  const s = freshSave(); s.seed = 'ORB'; s.perception.aperture = 3255; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const run = (g, from, ms) => { let t = from; for (; t < from + ms; t += 50) g.update(.05, idle, t); return t; };

test('Orbit Volley is a Rift spell from Infinite III; the rules', () => {
  assert.ok(SPELLS['orbit-volley']); assert.ok(CASTABLES['spell:orbit-volley']);
  assert.equal(orbitCount(0), ORBIT.minOrbs); assert.equal(orbitCount(ORBIT.charge), ORBIT.maxOrbs);
  assert.equal(orbitPerfect(1), false); assert.equal(orbitPerfect((ORBIT.perfectFrom + ORBIT.charge) / 2), true); assert.equal(orbitPerfect(ORBIT.charge + .3), false);
  assert.equal(orbitLaunch(0).share, 1); assert.ok(orbitLaunch(1.5).share > 1); assert.equal(orbitLaunch(2.2).share, ORBIT.perfect); assert.equal(orbitLaunch(3, true).share, 1);
});

test('two presses: gather, then launch at the foe; it bursts on it', () => {
  const { g } = arena([['foe', 15, 10]]); let t = run(g, 1000, 50);
  g.castSpell('orbit-volley'); assert.ok(g.orbit && !g.orbit.flight, 'orbs gathered');
  t = run(g, t, 1000); g.castSpell('orbit-volley'); assert.ok(g.orbit?.flight, 'launched');
  run(g, t, 800); assert.equal(g.orbit, null); assert.ok(g.enemies[0].hp < 5000, 'the ball hit');
});

test('a perfect volley hits harder than an early one and leaves a vortex', () => {
  const lost = (wait) => { const { g } = arena([['foe', 15, 10]]); let t = run(g, 1000, 50); g.castSpell('orbit-volley'); t = run(g, t, wait); g.castSpell('orbit-volley'); const perfect = g.orbit.flight.perfect; run(g, t, 600); return { dmg: 5000 - g.enemies[0].hp, perfect, vortex: g.effects.some((e) => e.kind === 'gravity-well') }; };
  const early = lost(200), perfect = lost(2200);
  assert.equal(early.perfect, false); assert.equal(perfect.perfect, true); assert.ok(perfect.vortex, 'a vortex opens');
  assert.ok(perfect.dmg > early.dmg * 1.5, `${early.dmg} -> ${perfect.dmg}`);
});

test('left alone, the orbs go on their own as a plain ball', () => {
  const { g } = arena([['foe', 15, 10]]); let t = run(g, 1000, 50); g.castSpell('orbit-volley');
  t = run(g, t, ORBIT.window * 1000 + 100); assert.ok(g.orbit?.flight || g.enemies[0].hp < 5000, 'fired by itself');
  run(g, t, 800); assert.ok(g.enemies[0].hp < 5000);
  assert.ok(g.save.magicSkills.cooldowns['spell:orbit-volley'] > 0, 'cooldown starts on launch');
});

test('a wall stops the ball', () => {
  const { g } = arena([['foe', 16, 10]]); for (const t of g.map.tiles) if (t.x === 13) t.blocked = true;
  let t = run(g, 1000, 50); g.castSpell('orbit-volley'); t = run(g, t, 300); g.castSpell('orbit-volley'); run(g, t, 1200);
  assert.equal(g.enemies[0].hp, 5000, 'the foe behind the wall is untouched');
});
