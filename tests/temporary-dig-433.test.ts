// Release 433 (Tim: "I'm at a wall right now... it says the walls cannot be bitten by the shovel... we need to make sure
// that the shovels are actually working"): the shovel (and the iron shovel) dig in temporary places too; their tunnels and
// finds are not written to the save.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { DIG, ensureDigging, planDig, dig, canDigArea, canDigHere } from '../src/digging.ts';

const W = 12, H = 9;
const map = () => ({ width: W, height: H, objects: [], tiles: Array.from({ length: W * H }, (_, i) => { const x = i % W, y = Math.floor(i / W), wall = x === 0 || y === 0 || x === W - 1 || y === H - 1 || x >= 5; return { x, y, kind: wall ? 'wall' : 'floor', blocked: wall }; }) });

test('Far Array runs, arenas, hunts, grottoes and crossings: the shovel bites, nothing is saved', () => {
  for (const id of ['far-array:run-1', 'arena:3', 'hunt-instance:a', 'dive:1:2', 'displacement:1', 'elite-portal:x']) {
    const s = freshSave(); ensureDigging(s); s.digging.shovel = 2; const m = map();
    assert.equal(canDigHere(id), true); assert.equal(canDigArea(id), false);
    const plan = planDig(m, 4, 3, 'right', id); assert.ok(plan.ok, id);
    const r = dig(s, m, plan, id); assert.ok(r.ok, r.message); assert.equal(m.tiles[3 * W + 5].blocked, false);
    assert.equal(s.digging.dug[id], undefined, 'not written to the save'); assert.equal(s.digging.shovel, 1);
  }
  const s = freshSave(); ensureDigging(s); s.digging.iron = DIG.iron.uses; const m = map(), plan = planDig(m, 4, 3, 'right', 'far-array:run-2', { iron: true });
  assert.ok(dig(s, m, plan, 'far-array:run-2').ok, 'the iron shovel too');
});
