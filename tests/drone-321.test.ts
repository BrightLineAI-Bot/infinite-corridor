// Release 321 (Tim, 2026-10-22): from the fourth Gate the frame can call up a drone instead of the robot: it flies beside
// the Wayfarer, fires homing rockets, mends them on command or when low, and carries them while Jump is held.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE, setMechMode, ensureMech } from '../src/vehicle-gates.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const ready = (listeners = 4) => { const s = freshSave(); s.seed = 'DRONE'; s.perception.aperture = 3255; s.farArray = { listeners }; s.consumables.submersible = 1; return s; };
const ashore = (s) => { const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; return g; };

test('the drone needs the fourth Gate; the frame calls up whichever is chosen', () => {
  const low = ready(3); assert.equal(setMechMode(low, 'drone').ok, false);
  const s = ready(), g = ashore(s);
  assert.equal(setMechMode(s, 'drone').ok, true);
  assert.equal(g.useConsumable('submersible', 0), true); assert.ok(g.droneUp()); assert.equal(g.mechUp(), false, 'not the robot');
  assert.equal(g.useConsumable('submersible', 0), true); assert.equal(g.droneUp(), false, 'docked');
  setMechMode(s, 'robot'); g.useConsumable('submersible', 0); assert.ok(g.mechUp()); assert.equal(g.droneUp(), false);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.mech.mode, 'robot'); assert.equal(back.mech.built, true);
  const old = freshSave(); old.mech = { built: true, active: false, plate: 60, fuel: 1, cooldown: 0 }; ensureMech(old); assert.equal(old.mech.mode, undefined, 'a 317 robot gains no new fields');
});

test('it fires a homing rocket at the nearest creature, and the rocket bends to it', () => {
  const s = ready(), g = ashore(s); setMechMode(s, 'drone'); g.useConsumable('submersible', 0);
  g.enemies = [g.createEnemyFromSpawn({ kind: 'ashling', x: g.player.x + 4, y: g.player.y + 2 })];
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  g.projectiles = []; g.update(.05, idle, 1000);
  const r = g.projectiles.find((p) => p.droneRocket); assert.ok(r, 'a rocket'); assert.equal(r.seekId, g.enemies[0].id);
  r.dx = 0; r.dy = -1; const before = r.dy; g.update(.05, idle, 1050); assert.ok(r.dead || r.dy > before, 'turned toward its mark');
  assert.ok(s.mech.rocketCd > 0 && s.mech.rocketCd <= DRONE.rocketEvery);
});

test('it mends on command, and by itself when the Wayfarer is low; then rests', () => {
  const s = ready(), g = ashore(s); setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.maxHp = 100; g.player.maxHp = 100;
  g.player.hp = 60; assert.equal(g.useConsumable('submersible', 0), true); assert.equal(g.player.hp, 90); assert.ok(g.droneUp(), 'still flying'); assert.equal(s.mech.healCd, DRONE.healCooldown);
  g.useConsumable('submersible', 0); assert.equal(g.droneUp(), false, 'resting: the press docks it instead');
  g.useConsumable('submersible', 0); s.mech.healCd = 0; g.player.hp = 20;
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; g.update(.05, idle, 5000);
  assert.ok(g.player.hp >= 50, `mended by itself (${g.player.hp})`);
});

test('holding Jump in the air, it carries the Wayfarer over a chasm (release 647: on the overworld, Jump again in the air fires the booster)', () => {
  const s = ready(), g = ashore(s); setMechMode(s, 'drone'); g.useConsumable('submersible', 0);
  const w = g.map.width || 32, row = 16; for (let x = 0; x < w; x++) Object.assign(g.map.tiles[row * w + x], { kind: x >= 12 && x <= 14 ? 'canyon' : 'ash', blocked: false, elev: 0, landscape: null, environment: x >= 12 && x <= 14 ? 'canyon' : null });
  Object.assign(g.player, { x: 10.2, y: row - .3, hp: 100 }); s.maxHp = 100;
  let t = 1000; const press = { state: { x: 1, y: 0 }, consume: (k) => k === 'jump' && (t === 1000 || t === 1100), held: (k) => k === 'jump' };
  for (let i = 0; i < 50; i++) { g.update(.05, press, t); t += 50; }
  assert.ok(g.player.hp > 0, 'did not fall'); assert.ok(g.player.x > 14.5, `carried across (x=${g.player.x.toFixed(2)})`); assert.ok(s.mech.fuel < DRONE.carry);
});
