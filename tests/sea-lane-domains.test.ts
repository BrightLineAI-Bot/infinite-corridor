// The sea-lane pre-check (release 1055) must not refuse a lane into a far domain, which loadArea builds whole whatever its
// base terrain (release review of r1058). Repro: seed CORRIDOR-DOM8, walking south from -1205,32 into a Mountain Turtle domain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, SEA_REFUSAL } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

test('a walker crosses into a far domain whose base terrain is sea at the lane', () => {
  const s: any = freshSave(); s.seed = 'CORRIDOR-DOM8'; Object.assign(s.session, { area: 'overworld', rx: -1205, ry: 32, x: 16, y: 16 });
  const g: any = new Game(migrateSave(structuredClone(s)), 1000); for (const e of g.enemies) e.dead = true;
  assert.equal(g.seaBeyondLane(0, 1), false, 'the pre-check leaves a domain lane to the full crossing');
  g.player.x = g.map.exits.south; g.player.y = 29.5;
  const state: any = { x: 0, y: 1 }, input = { state, consume: (k: string) => { const v = state[k]; state[k] = false; return !!v; }, held: () => false, reset() {} };
  let now = 1000; for (let i = 0; i < 240 && g.ry === 32; i++) { now += 1000 / 60; state.y = 1; g.update(1 / 60, input, now); for (const e of g.enemies) e.dead = true; }
  assert.deepEqual([g.rx, g.ry], [-1205, 33]);
  assert.ok(g.map.farDomain, 'the Wayfarer is in the domain');
  assert.notEqual(g.message, SEA_REFUSAL);
});
