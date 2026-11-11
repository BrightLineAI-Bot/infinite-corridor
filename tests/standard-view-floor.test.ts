// The Wayfarer stands on the floor he is drawn on (Tim, 2026-11-11, the standard view: in the Pentagons "the character seems to
// be kind of like floating above the ground"). A versioned interior heightfield (great-buildings.ts addInteriorTerrain: v9+
// Pentagon chambers, v3+ buildings, castles, compounds and labyrinths) raises half the floor two or three levels, and its
// tiles are painted flat in the standard view (they carry no landscape lift), yet the Wayfarer, the camera and every creature
// were lifted by those levels: two or three levels is .68 to 1.02 of a tile above the floor drawn under him. Now the standard view
// draws them on the flat floor; a hop or the drone is drawn by its height over the floor under it (as Close View's flat capture
// always was). Overworld terrain, great trees, built stone and Close View are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render, STANDARD_VIEW_FLOOR } from '../src/renderer.ts';
import { interiorTerrain, LIFT_PER_LEVEL, liftAt } from '../src/landscape.ts';
import { wonderAt } from '../src/wonders.ts';

// A context that records the camera (the first translate) and every vertical translate made to lift a drawing.
function camera() {
  const moves = [];
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getTransform: () => ({}), getImageData: () => ({ data: new Uint8ClampedArray(4) }), translate(x, y) { moves.push([x, y]); } }, { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true });
  return { ctx, moves };
}
const W = 360, H = 640, S = Math.round(Math.max(28, Math.min(44, W / 12)));
const chamber = (seed, V) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); s.session.activeDungeonId = `pentagon:${seed}:0:0:v${V}:f1`; s.session.dungeonReturn = { rx: 0, ry: 0, x: 16, y: 16 }; g.loadArea('dungeon', false); g.enemies = []; return g; };
const shot = (g) => { const { ctx, moves } = camera(); render(ctx, g, W, H, 5000); return moves; };

test('a Pentagon chamber with raised floor: the camera and the Wayfarer sit on the flat-drawn floor, not .68 to 1 tile above it', () => {
  let checked = 0;
  for (const seed of ['TIM1', 'PENT-A', 'PENT-B']) {
    const g = chamber(seed, 10); assert.ok(interiorTerrain(g.map), `${seed}: a heightfield interior`);
    const raised = g.map.tiles.find((t) => !t.blocked && !t.slope && (t.elev || 0) >= 2 && !t.interiorPlatform); assert.ok(raised, 'a raised half');
    g.player.x = raised.x - .5; g.player.y = raised.y - .75 + .5; const lifted = liftAt(g.map, g.map.width, g.player.x, g.player.y); assert.ok(lifted >= 2 * LIFT_PER_LEVEL - 1e-9, `the old lift: ${lifted}`);
    const cam = shot(g)[0]; assert.equal(cam[1], Math.round(H / 2 - g.player.y * S), `${seed}: the camera centres the Wayfarer where he stands`);
    assert.ok(!shot(g).some(([x, y]) => x === 0 && Math.abs(y + lifted * S) < .5), 'nothing drawn lifted by the raised floor\'s height');
    const was = STANDARD_VIEW_FLOOR.flatInterior; try { STANDARD_VIEW_FLOOR.flatInterior = false; const old = shot(g); assert.equal(old[0][1], Math.round(H / 2 - (g.player.y - lifted) * S), 'before: lifted'); assert.ok(old.some(([x, y]) => x === 0 && Math.abs(y + lifted * S) < .5), 'before: the Wayfarer drawn lifted over a flat floor'); }
    finally { STANDARD_VIEW_FLOOR.flatInterior = was; }
    checked++;
  }
  assert.equal(checked, 3);
});

test('a hop from an interior platform is still drawn by its height over the floor under it', () => {
  for (const seed of ['TIM1', 'PENT-A', 'PENT-B']) {
    const g = chamber(seed, 10), top = g.map.tiles.find((t) => t.platformTop); if (!top) continue;
    const floor = g.map.tiles.find((t) => !t.blocked && !(t.elev || 0) && !t.slope);
    g.player.x = floor.x - .5; g.player.y = floor.y - .75 + .5; g.jumpUntil = 6000; g.jumpStart = 4800; g.jumpDur = 1200; g.skyAir = top.elev;
    const moves = shot(g); assert.equal(moves[0][1], Math.round(H / 2 - (g.player.y - top.elev * LIFT_PER_LEVEL) * S), 'the camera follows the hop at the platform\'s height');
    return;
  }
  assert.fail('no platform top in three chambers');
});

test('unchanged elsewhere: on a great tree\'s branch the Wayfarer is still drawn at the branch\'s height', () => {
  for (let y = 14; y < 60; y++) for (let x = 14; x < 60; x++) { if (!wonderAt('CLIMB18', x, y, 'tree')) continue;
    const s = freshSave(); s.seed = 'CLIMB18'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); g.enemies = []; if (!g.map.canopy) continue;
    const b = g.map.tiles.find((t) => t.canopy && t.kind === 'canopyBranch' && (t.elev || 0) >= 3); g.player.x = b.x; g.player.y = b.y - .25;
    const lift = liftAt(g.map, 32, g.player.x, g.player.y); assert.ok(lift > 1); assert.equal(shot(g)[0][1], Math.round(H / 2 - (g.player.y - lift) * S)); return; }
  assert.fail('no tree');
});
