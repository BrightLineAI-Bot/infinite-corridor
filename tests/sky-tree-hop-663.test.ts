// Release 663 (Tim, 2026-11-01: "if you cross the skylands... it'll take you to the top of another tree that you haven't
// discovered... so you can either parachute down or you can hop down"): a sky gate lands the Wayfarer on a great tree's crown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, SKY_TREE } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';

const crownOf = (g) => { const t = g.map.tiles[Math.floor(g.player.y + .2) * 32 + Math.floor(g.player.x)]; return t?.kind === 'canopyTrunk' && t.elev === g.map.canopy?.top; };

test('a sky gate near jungle drops you on a great tree\'s crown, one you have not seen first', () => {
  let landed = 0, tried = 0;
  for (let x = 20; x < 200 && landed < 3; x += 9) for (let y = 20; y < 200 && landed < 3; y += 11) {
    if (sectionRegion('SKYTREE', x, y, LANDSCAPE_VERSION).type !== 'jungle') continue; tried++;
    const s = freshSave(); s.seed = 'SKYTREE'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
    const ok = g.treeCrownHop(`skyland:SKYTREE:${x},${y}:mgate:t0:r1`, { rx: x, ry: y });
    if (ok) { landed++; assert.ok(crownOf(g), 'standing on the crown'); assert.ok(!(g.rx === x && g.ry === y)); }
    else assert.deepEqual([g.rx, g.ry], [x, y], 'none found: put back');
    if (tried > 30) break;
  }
  assert.ok(landed >= 1, `${landed} landings`); assert.ok(SKY_TREE.loads <= 4, 'bounded');
});

test('with no jungle about, the gate drops you on the ground as before', () => {
  const s = freshSave(); s.seed = 'SKYTREE'; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld');
  g.skyHop('skyland:SKYTREE:0,0:mgate:t0:r1', 'Dropped.'); assert.ok(!(g.rx === 0 && g.ry === 0)); assert.match(g.message, /Dropped\./);
});
