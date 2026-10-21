// Release 271 (Tim, 2026-10-21): Gate Revenants stalk, then hunt; they cross dungeon walls, dodge, and break.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { GATE_REVENANT } from '../src/monster-pack.ts';
import { dungeonHistory } from '../src/interactions.ts';

function hordeDungeon() {
  for (let rx = -8; rx < 8; rx++) for (let ry = -8; ry < 8; ry++) {
    const s = freshSave(); s.seed = 'HORDE'; s.level = 12; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
    const d = g.map.objects.find((o) => o.kind === 'dungeon'); if (!d) continue;
    dungeonHistory(s, `dungeon:${s.seed}:g${s.worldGeneration}:${rx}:${ry}:${d.id}`).horde = { total: 30, left: 30 };
    Object.assign(g.player, { x: d.x, y: d.y + 1 }); g.interact(d.actions?.[0], d.id);
    if (g.area !== 'dungeon' || g.map.multiLevel) continue;
    g.player.hp = 1e9; return { s, g };
  }
  throw new Error('no dungeon');
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const run = (g, secs, t0 = 1000) => { let t = t0; for (let k = 0; k < secs * 20; k++) { g.update(.05, idle, t += 50); g.player.hp = 1e9; } return t; };
const walkable = (g) => { const w = g.map.width, floor = g.playerFloor(); return (e) => floor.has(Math.round(e.y) * w + Math.round(e.x)); };

test('in a dungeon a Revenant stalks at a distance for two minutes, then hunts the Wayfarer wherever they are', () => {
  const { g } = hordeDungeon(), e = g.enemies[0];
  g.enemies = [e]; assert.equal(GATE_REVENANT.huntAfter, 120);
  run(g, 20);
  assert.ok(!e.aggro, 'still stalking'); const d = Math.hypot(e.x - g.player.x, e.y - g.player.y);
  assert.ok(d >= GATE_REVENANT.stalkAggro, `keeps its distance (${d.toFixed(1)})`);
  g.dungeonClock = GATE_REVENANT.huntAfter; run(g, .2, 50000); assert.equal(e.aggro, true, 'after two minutes it hunts');
});

test('stalking, it turns on the Wayfarer who comes close or wounds it', () => {
  const { g } = hordeDungeon(), e = g.enemies[0]; g.enemies = [e];
  e.hp -= 1; run(g, .1); assert.equal(e.aggro, true, 'wounded');
});

test('hunting, it passes through dungeon walls toward the Wayfarer, never beyond the dungeon, and comes out on floor they can reach', () => {
  const { g } = hordeDungeon(), e = g.enemies[0], on = walkable(g); g.enemies = [e]; e.aggro = true; g.dungeonClock = 999;
  let inWall = 0, t = 1000; const bounds = g.roamerBounds(), w = g.map.width;
  for (let k = 0; k < 20 * 20; k++) { g.update(.05, idle, t += 50); g.player.hp = 1e9; if (!on(e)) inWall++; if (bounds) assert.equal(bounds[Math.round(e.y) * w + Math.round(e.x)], 1, 'inside the dungeon'); }
  assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) < 4, 'it reached the Wayfarer');
});

test('it may slip a swing (smart dodge), and enough quick blows break its poise before it springs away', () => {
  const { g } = hordeDungeon(), e = g.enemies[0]; g.enemies = [e]; e.aggro = true;
  Object.assign(e, { x: g.player.x + 1.2, y: g.player.y });
  let dodged = 0; for (let k = 0; k < 30; k++) { g.player.meleeUntil = 1e12; e.gateDodgeAt = 0; e.gateEvade = null; e.untargetable = false; g.update(.05, idle, 2000 + k * 50); if (e.gateEvade) dodged++; }
  g.player.meleeUntil = 0; assert.ok(dodged > 3 && dodged < 27, `some, not all (${dodged}/30)`);
  e.gateEvade = null; e.untargetable = false;
  let t = 5000; for (let k = 0; k < GATE_REVENANT.poiseBreak.hits; k++) { e.hp -= 1; g.update(.05, idle, t += 50); }
  assert.ok(e.gateBroken > 0, 'poise broken'); const x = e.x; run(g, 1, t); assert.equal(e.x, x, 'down: it does not move');
  run(g, GATE_REVENANT.poiseBreak.time, t + 2000); assert.ok(!(e.gateBroken > 0), 'up again');
});
