// Release 317 (Tim, 2026-10-22): from Infinite III with the second Gate unlocked, the frame calls up the robot ashore: its own
// plating, 10% guard, and a held-Jump boost that carries the Wayfarer over chasms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MECH, ensureMech, mechAbsorb } from '../src/vehicle-gates.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const ready = () => { const s = freshSave(); s.seed = 'MECH'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; return s; };

test('gated; the first press builds it from a frame, later presses call it up and stow it', () => {
  const low = ready(); low.farArray = { listeners: 1 }; const gl = new Game(low, 0); assert.equal(gl.useConsumable('submersible', 0), false); assert.match(gl.message, /second Gate/);
  const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld');
  assert.equal(g.useConsumable('submersible', 0), true); assert.equal(s.consumables.submersible, 0, 'the frame is spent once'); assert.equal(s.mech.built, true); assert.ok(g.mechUp());
  assert.equal(g.useConsumable('submersible', 0), true); assert.equal(g.mechUp(), false, 'stowed');
  assert.equal(g.useConsumable('submersible', 0), true, 'called again without another frame'); assert.ok(g.mechUp());
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).mech.built, true);
});

test('plating takes blows first with a 10% guard; broken, it folds away for a while', () => {
  const s = freshSave(); s.mech = { built: true, active: true, plate: 10 }; ensureMech(s);
  const r = mechAbsorb(s, 10); assert.equal(r.kept, 0); assert.equal(s.mech.plate, 1);
  const r2 = mechAbsorb(s, 20); assert.ok(Math.abs(r2.kept - (20 * .9 - 1)) < 1e-9); assert.equal(r2.broke, true); assert.equal(s.mech.active, false); assert.equal(s.mech.cooldown, MECH.rebuild);
});

test('holding Jump in the air boosts: the Wayfarer stays aloft and crosses a chasm', () => {
  const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; g.useConsumable('submersible', 0);
  const w = g.map.width || 32, row = 16; for (let x = 0; x < w; x++) Object.assign(g.map.tiles[row * w + x], { kind: x >= 12 && x <= 13 ? 'canyon' : 'ash', blocked: false, elev: 0, landscape: null, environment: x >= 12 && x <= 13 ? 'canyon' : null });
  Object.assign(g.player, { x: 10.2, y: row - .3, hp: 100 }); s.maxHp = 100;
  let t = 1000; const press = { state: { x: 1, y: 0 }, consume: (k) => k === 'jump' && t === 1000, held: (k) => k === 'jump' };
  for (let i = 0; i < 40; i++) { g.update(.05, press, t); t += 50; }
  assert.ok(g.player.hp > 0, 'did not fall'); assert.ok(g.player.x > 13.5, `crossed (x=${g.player.x.toFixed(2)})`); assert.ok(s.mech.fuel < MECH.boost, 'burned thrust');
});
