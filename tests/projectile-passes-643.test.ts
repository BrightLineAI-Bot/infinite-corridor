// Release 643 (Tim, 2026-11-01: "if it passes through their body, and then it arcs back on its homing track, and it passes through
// their body again... and then I somehow maneuver to get it to pass through their body a third time, that should be three separate
// instances of damage"): a projectile that survives a hit counts every separate pass through a body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, PASS_CLEAR } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { NANOKNIVES } from '../src/tool-forms.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function arena() { const s = freshSave(); s.seed = 'PASS643'; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = [];
  for (const t of g.map.tiles) Object.assign(t, { blocked: false, kind: 'grass', elev: 0, structure: null, buildingId: null, environment: null });
  const e = createCombatant('ashling', 16, 10, false, []); Object.assign(e, { id: 'dummy', hp: 10000, maxHp: 10000, damage: 0, speed: 0, aggro: false }); g.enemies.push(e); Object.assign(g.player, { x: 16, y: 20 }); return { g, e }; }

test('a homing knife goes through, curls back and hits again: each pass is a hit', () => {
  const { g, e } = arena(); let t = 1000;
  g.projectiles.push({ id: 'k1', x: 16.5, y: 13, dx: 0, dy: -1, speed: NANOKNIVES.speed, life: NANOKNIVES.life, damage: 10, damageType: 'physical', path: 'straight', age: 0, hits: {}, pierce: 0, seekId: e.id, seekTurn: NANOKNIVES.seekTurn, knife: true });
  for (let i = 0; i < 60; i++) { t += 50; g.update(.05, idle, t); }
  const hits = Math.round((10000 - e.hp) / 10); assert.ok(hits >= 2, `${hits} passes`);
});

test('a piercing shot that stays inside a body is one hit, not one a frame', () => {
  const { g, e } = arena(); let t = 1000;
  g.projectiles.push({ id: 'p1', x: 16.5, y: 10.45, dx: 0, dy: 0, speed: 0, life: 1, damage: 10, damageType: 'physical', path: 'straight', age: 0, hits: {}, pierce: 3 });
  for (let i = 0; i < 10; i++) { t += 50; g.update(.05, idle, t); }
  assert.equal(10000 - e.hp, 10); assert.ok(PASS_CLEAR > 0);
});
