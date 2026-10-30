// Release 475 (Tim, 2026-10-27): an aperture crystal sat in lava where it could not be reached; and "when I have power armor
// I can walk through the lava... the power armor doesn't take damage, but I take damage... I can still die".
import test from 'node:test';
import assert from 'node:assert/strict';
import { MECH_LAVA } from '../src/vehicle-gates.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { rng } from '../src/random.ts';
import { apertureReach, perceptionOverlay } from '../src/world.ts';

const ready = () => { const s = freshSave(); s.seed = 'LAVA'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; return s; };
const lavaRow = (g, from, to) => { const w = g.map.width || 32, row = 16; for (let x = 0; x < w; x++) { const lava = x >= from && x <= to; Object.assign(g.map.tiles[row * w + x], { kind: lava ? 'lava' : 'ash', blocked: false, elev: 0, landscape: null, environment: lava ? 'lava' : null }); } return row; };
const walk = (g, n, dir = 1, start = 1000) => { let t = start; const input = { state: { x: dir, y: 0 }, consume: () => false, held: () => false }; for (let i = 0; i < n; i++) { g.update(.05, input, t); t += 50; } return t; };

test('in the robot the Wayfarer wades through lava, losing health to the heat while the plating is untouched', () => {
  const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; g.useConsumable('submersible', 0); assert.ok(g.mechUp());
  const row = lavaRow(g, 12, 13); s.maxHp = 1000; Object.assign(g.player, { x: 10.2, y: row - .3, hp: 1000 }); const plate = s.mech.plate;
  walk(g, 30);
  assert.ok(g.player.hp > 0, 'still alive'); assert.ok(g.player.x > 13.5, `crossed (x=${g.player.x.toFixed(2)})`);
  assert.ok(g.player.hp < 1000, 'the heat hurt'); assert.equal(s.mech.plate, plate, 'the robot takes none of it'); assert.ok(g.mechUp());
});

test('the heat can kill: standing in lava in the robot drains MECH_LAVA.heat of maximum health a second', () => {
  const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; g.useConsumable('submersible', 0);
  const row = lavaRow(g, 8, 20); s.maxHp = 200; Object.assign(g.player, { x: 12.2, y: row - .3, hp: 200 });
  const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000;
  for (let i = 0; i < 20; i++) { g.update(.05, still, t); t += 50; } // one second
  assert.ok(Math.abs(g.player.hp - 200 * (1 - MECH_LAVA.heat)) < 2, `one second costs ${MECH_LAVA.heat * 100}% (hp ${g.player.hp})`);
  for (let i = 0; i < 20 * 12 && !(s.worldFlags.deaths > 0); i++) { g.update(.05, still, t); t += 50; }
  assert.equal(s.worldFlags.deaths, 1, 'cooked inside the robot');
});

test('without the robot lava still swallows the Wayfarer at once', () => {
  const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; assert.equal(g.mechUp(), false);
  const row = lavaRow(g, 12, 13); s.maxHp = 1000; Object.assign(g.player, { x: 10.2, y: row - .3, hp: 1000 });
  walk(g, 30); assert.equal(s.worldFlags.deaths, 1, 'fell into the lava');
});

// The pre-475 overlay picks, for comparison.
const oldPicks = (seed, id, tiles, width) => { const r = rng(`${seed}:aperture:v1:${id}`), open = tiles.filter((t) => !t.blocked && t.x > 5 && t.y > 5 && t.x < width - 3 && t.y < width - 3), pick = () => open[Math.floor(r() * open.length)] || { x: 8, y: 8 }; return [pick(), pick(), pick()]; };
const LETHAL = ['lava', 'abyss', 'canyon', 'river', 'dungeonWater'];

test('aperture objects never sit on lethal ground or out of the entry\'s reach; safe picks keep their place', () => {
  let moved = 0, kept = 0;
  for (let i = 0; i < 120; i++) {
    const s = migrateSave(freshSave()); s.seed = `AP-${i}`; const g = new Game(s, 0), rx = (i % 23) - 11, ry = Math.floor(i / 23) - 8; g.rx = rx; g.ry = ry;
    const id = s.session.activeDungeonId = `dungeon:${s.seed}:g${s.worldGeneration}:${rx}:${ry}:d${i}`; s.session.dungeonReturn = { rx, ry, x: 5, y: 5 };
    g.loadArea('dungeon', false); const m = g.map, w = m.width || 24, reach = apertureReach(m.tiles, w, m.entry), ok = (t) => t && !t.blocked && !LETHAL.includes(t.kind);
    for (const o of m.objects.filter((o) => /^aperture(Memory|Door|Relic)$/.test(o.kind))) assert.ok(ok(m.tiles[o.y * w + o.x]), `${s.seed} ${o.kind} on ${m.tiles[o.y * w + o.x]?.kind}`);
    const now = perceptionOverlay(s.seed, id, m.tiles, w, m.entry).objects, old = oldPicks(s.seed, id, m.tiles, w);
    now.forEach((o, k) => {
      assert.ok(ok(m.tiles[o.y * w + o.x]), `${s.seed} ${o.kind} on lethal ground`); if (reach) assert.ok(reach.has(o.y * w + o.x), `${s.seed} ${o.kind} out of reach`);
      const b = old[k]; if (m.chasm) return; /* release 593: a chasm crossing's drop is new lethal ground; its picks are checked above, not counted */ if (ok(m.tiles[b.y * w + b.x]) && (!reach || reach.has(b.y * w + b.x))) { assert.deepEqual([o.x, o.y], [b.x, b.y], 'a safe pick never moves'); kept++; } else moved++;
    });
  }
  assert.ok(moved > 0, 'some unsafe picks were moved'); assert.ok(kept > moved * 10);
});
